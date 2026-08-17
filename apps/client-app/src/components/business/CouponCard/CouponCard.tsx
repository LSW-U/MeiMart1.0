import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, textStyle, spacing, borderRadius } from '@/theme';
import { Button } from '@/components/ui/Button';
import { formatCouponValue } from '@/utils/coupon';
import type { CouponCardProps } from './CouponCard.types';

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
  const isExpired = coupon.status === 'expired';

  // Why: 外层不包 Pressable —— Web 端 Pressable 渲染成 <button>，与内部动作按钮（也是
  //      Pressable→button）嵌套即非法 DOM（hydration error，memory web-nested-pressable）。
  //      整卡 onPress 两个消费方（coupons.tsx / claim.tsx）都没传，纯死代码；未来做
  //      「点卡展开详情」时用平级结构（外层 View + 独立可点区域），见优惠券卡片模块盘点 Q10。
  return (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: isValid ? colors['primary-container'] : colors['surface-container-high'],
          borderColor: isValid ? colors.primary : colors['outline-variant'],
        },
      ]}
      accessibilityLabel={t('coupons.cardLabel', {
        name: coupon.name,
        discount: discountLabel,
        defaultValue: `Coupon: ${coupon.name}, ${discountLabel}`,
      })}
    >
      <View style={styles.left}>
        <Text
          style={[
            textStyle('price-display'),
            { color: isValid ? colors.primary : colors['on-surface-variant'] },
          ]}
        >
          {discountLabel}
        </Text>
        <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
          {t('coupons.minSpend', { amount: coupon.minOrderAmount, defaultValue: 'Min spend' })}
        </Text>
      </View>
      <View style={styles.divider}>
        <View
          style={[
            styles.dashLine,
            { backgroundColor: isValid ? colors.primary : colors['outline-variant'] },
          ]}
        />
      </View>
      <View style={styles.right}>
        <Text
          style={[textStyle('body-md'), { fontWeight: '700', color: colors['on-surface'] }]}
          numberOfLines={2}
        >
          {coupon.name}
        </Text>
        {isUsed && (
          <Text style={[textStyle('label-caps'), { color: colors['on-surface-variant'] }]}>
            {t('coupons.used', { defaultValue: 'Used' })}
          </Text>
        )}
        {isExpired && (
          <Text style={[textStyle('label-caps'), { color: colors['on-surface-variant'] }]}>
            {t('coupons.expired', { defaultValue: 'Expired' })}
          </Text>
        )}
        {/* Why: action='claim'（领券中心）显示「领取」替代「Use Now」；默认 available 态显示 Use Now；used/expired 不可用 */}
        {action === 'claim' ? (
          onClaim && (
            <Button
              label={claiming ? t('claim.claiming', { defaultValue: 'Claiming…' }) : t('claim.claimBtn', { defaultValue: 'Claim' })}
              variant="primary"
              size="sm"
              loading={claiming}
              disabled={claiming}
              onPress={() => onClaim(coupon)}
            />
          )
        ) : (
          isValid && onUse && (
            <Button
              label={t('coupons.useNow', { defaultValue: 'Use Now' })}
              variant="text"
              size="sm"
              onPress={() => onUse(coupon)}
            />
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  left: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    gap: 4,
  },
  divider: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashLine: {
    width: 1,
    height: '60%',
    borderStyle: 'dashed',
  },
  right: {
    flex: 1,
    padding: spacing.sm,
    gap: 4,
    justifyContent: 'center',
  },
});
