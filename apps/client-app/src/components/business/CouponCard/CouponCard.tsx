import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useTheme, spacing, borderRadius, typography } from '@/theme';
import { Button } from '@/components/ui/Button';
import { formatCouponValue } from '@/utils/coupon';
import type { ClientCoupon } from '@/services/promotion';
import type { CouponCardProps } from './CouponCard.types';

// Why: 剩余天数 chip 三档（模块方案 D2 / 决策 4A）：>3 天 positive、≤3 天 warning、
//      今天内到期「今天到期」；used/expired 由状态章表达，不算天数。
//      纯工具函数（组件外）不受 react-hooks/purity 约束。
//      Math.ceil 口径：剩 12h → 1（还有今天可算），今天 0 点后已过 → ≤0，券已过期。
//      返回 0 表示「今天内到期」（endAt 在今天剩余时间内），<0 已过期。
export function couponDaysLeft(endAt: string): number {
  return Math.ceil((new Date(endAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function typeLabel(coupon: ClientCoupon, t: TFunction): string {
  switch (coupon.type) {
    case 'PERCENTAGE':
      return t('coupons.typePercentage', { defaultValue: 'PERCENTAGE' });
    case 'FIXED_AMOUNT':
      return t('coupons.typeFixed', { defaultValue: 'VOUCHER' });
    case 'FREE_DELIVERY':
      return t('coupons.typeFreeDelivery', { defaultValue: 'FREE DELIVERY' });
    default:
      return '';
  }
}

export function CouponCard({
  coupon,
  onUse,
  action,
  onClaim,
  claiming,
  testID,
}: CouponCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const discountLabel = formatCouponValue(coupon, t);
  // Why: ClientCoupon.status 后端目前只返 'available'（B10，ACTIVE + 有效期内 + 未超额）；
  //      P2 后端扩 used/expired 后 isUsed/isExpired 自动生效（status 联合类型已对齐）。
  const isValid = coupon.status === 'available';
  const isUsed = coupon.status === 'used';

  // 剩余天数（仅 available 态显示；决策 4A 全量 chip）
  // Why: Math.ceil 使「今天内到期」算出 0（剩 12h → ceil(0.5)=1 只有跨过今天 0 点才对）——
  //      精确口径：>0 剩 N 天，=0 今天到期，<0 已过期不显示（审查 Q1 与 Picker 统一）
  const daysLeft = isValid ? couponDaysLeft(coupon.endAt) : 0;

  // Why: 外层不包 Pressable —— Web 端 Pressable 渲染成 <button>，与内部动作按钮（也是
  //      Pressable→button）嵌套即非法 DOM（hydration error，memory web-nested-pressable）。
  //      整卡 onPress 无人传，纯死代码；未来做「点卡展开详情」用平级结构（盘点 Q10）。
  return (
    <View
      testID={testID}
      style={[
        styles.ticket,
        {
          backgroundColor: isValid ? colors.surface : colors['surface-container-low'],
          borderColor: isValid ? colors['primary-container'] : colors['outline-variant'],
        },
      ]}
      accessibilityLabel={t('coupons.cardLabel', {
        name: coupon.name,
        discount: discountLabel,
        defaultValue: `Coupon: ${coupon.name}, ${discountLabel}`,
      })}
      accessibilityState={isValid ? undefined : { disabled: true }}
    >
      {/* 左栏（用户反馈浅红看不清 → 红底白字：primary 底 + on-primary 字，dashed 分隔） */}
      <View
        style={[
          styles.left,
          {
            backgroundColor: isValid ? colors.primary : colors['surface-container'],
            borderRightColor: isValid ? colors['primary-container'] : colors['outline-variant'],
          },
        ]}
      >
        {!isValid && (
          // 斜置状态章（原型 stamp：右上角 rotate 5deg 描边章）
          <View style={[styles.stamp, { borderColor: colors['on-surface-variant'] }]}>
            <Text style={[styles.stampText, { color: colors['on-surface-variant'] }]}>
              {isUsed
                ? t('coupons.used', { defaultValue: 'Used' })
                : t('coupons.expired', { defaultValue: 'Expired' })}
            </Text>
          </View>
        )}
        <Text
          style={[
            styles.type,
            { color: isValid ? colors['on-primary'] : colors['on-surface-variant'] },
          ]}
        >
          {typeLabel(coupon, t)}
        </Text>
        <Text
          style={[
            styles.value,
            { color: isValid ? colors['on-primary'] : colors['on-surface-variant'] },
          ]}
        >
          {discountLabel}
        </Text>
        {isValid && coupon.type === 'PERCENTAGE' && coupon.maxDiscountAmount != null && (
          // 百分比券封顶（D2：最高省 $X；FIXED/FREE_DELIVERY 无封顶概念）
          <Text
            style={[
              styles.cap,
              { color: isValid ? colors['on-primary'] : colors['on-surface-variant'] },
            ]}
          >
            {t('coupons.maxSave', {
              amount: coupon.maxDiscountAmount,
              defaultValue: 'Max save ${{amount}}',
            })}
          </Text>
        )}
      </View>

      {/* 右栏（原型 ticket-body：name / desc / 门槛 chip + 剩余天数 chip / 动作） */}
      <View style={styles.body}>
        <Text style={[styles.name, { color: colors['on-surface'] }]} numberOfLines={1}>
          {coupon.name}
        </Text>
        {isValid && coupon.description && (
          // D2：描述非空展示一行，空值隐藏（不造假文案）
          <Text
            style={[styles.desc, { color: colors['on-surface-variant'] }]}
            numberOfLines={1}
          >
            {coupon.description}
          </Text>
        )}
        {isValid && (
          <View style={styles.metaRow}>
            <View style={[styles.chip, { backgroundColor: colors['surface-container'] }]}>
              <Text style={[styles.chipText, { color: colors['on-surface-variant'] }]}>
                {t('coupons.minSpend', { amount: coupon.minOrderAmount })}
              </Text>
            </View>
            {/* 决策 4A：>3 天 positive / ≤3 天 warning（P18 页面另有近过期汇总条呼应）。
                三元与 Picker 一致（审查 Q1：原外层 daysLeft > 0 gate 使「今天到期」永不可达） */}
            {isValid && (daysLeft > 0 || couponDaysLeft(coupon.endAt) > -1) && (
              <View
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      daysLeft <= 3
                        ? colors.semantic['warning-container']
                        : colors.semantic['positive-container'],
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: daysLeft <= 3 ? colors.semantic.warning : colors.semantic.positive,
                    },
                  ]}
                >
                  {daysLeft > 0
                    ? t('coupons.daysLeft', {
                        count: daysLeft,
                        defaultValue: '{{count}} days left',
                      })
                    : t('coupons.expiresToday', { defaultValue: 'Expires today' })}
                </Text>
              </View>
            )}
          </View>
        )}
        {/* Why: action='claim'（领券中心）显示「领取」；默认 available 态显示「去逛逛」
                （决策 3A：跳首页，不再承诺「立即核销」）；used/expired 不可用无按钮 */}
        {action === 'claim' ? (
          onClaim && (
            <Button
              label={
                claiming
                  ? t('claim.claiming', { defaultValue: 'Claiming…' })
                  : t('claim.claimBtn', { defaultValue: 'Claim' })
              }
              variant="primary"
              size="sm"
              loading={claiming}
              disabled={claiming}
              onPress={() => onClaim(coupon)}
            />
          )
        ) : (
          isValid &&
          onUse && (
            <View style={styles.actions}>
              <Button
                label={t('coupons.goBrowse', { defaultValue: 'Go browse' })}
                variant="primary"
                size="sm"
                onPress={() => onUse(coupon)}
              />
            </View>
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: borderRadius.lg + 2,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 96,
  },
  left: {
    width: 112,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.sm + 2,
    gap: 4,
    borderRightWidth: 1,
    borderStyle: 'dashed',
  },
  type: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  cap: {
    fontSize: 10,
    textAlign: 'center',
    opacity: 0.85,
  },
  stamp: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    transform: [{ rotate: '5deg' }],
  },
  stampText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  body: {
    flex: 1,
    minWidth: 0,
    padding: spacing.md - 2,
    gap: 6,
  },
  name: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  desc: {
    fontSize: 11,
    lineHeight: 15,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 'auto',
  },
});
