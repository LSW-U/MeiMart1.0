import { useMemo } from 'react';
import { ScrollView, Pressable, View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, borderRadius } from '@/theme';
import { Modal } from '@/components/ui/Modal/Modal';
import { Icon } from '@/components/ui/Icon';
import { formatCouponValue } from '@/utils/coupon';
import { couponDaysLeft } from '@/components/business/CouponCard/CouponCard';
import type { ClientCoupon } from '@/services/promotion';
import type { CouponPickerProps } from './CouponPicker.types';

// PERCENTAGE 券本单预计节省（模块方案 B7：min(value%×amount, cap)，最终以 preview 为准）
function estimateSaving(coupon: ClientCoupon, orderAmount: number): number {
  switch (coupon.type) {
    case 'PERCENTAGE':
      return Math.min((coupon.value / 100) * orderAmount, coupon.maxDiscountAmount ?? Infinity);
    case 'FIXED_AMOUNT':
      return coupon.value;
    case 'FREE_DELIVERY':
      return 0; // 运费未知，不预估（meta 只显示剩余天数）
    default:
      return 0;
  }
}

// Why: 选券 Modal（模块方案 D4 归一）—— CouponCard 紧凑变体 + 本单可用/不可用分组 +
//      orderAmount 前置门槛判断（MIN_NOT_MET 显示差额；scope 类原因等后端字段，本期只有门槛）
//      ⚠️ 无独立 HTML 原型，视觉参照 模块化处理HTML/优惠券卡片模块-优化原型.html compact-ticket
export function CouponPicker({
  visible,
  onClose,
  coupons,
  orderAmount,
  selectedCode,
  onSelect,
  testID,
}: CouponPickerProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  // D4 分组：本单可用（金额达门槛）/ 本单不可用（显示差额）
  const { usable, unusable } = useMemo(() => {
    const usable: ClientCoupon[] = [];
    const unusable: ClientCoupon[] = [];
    for (const c of coupons) {
      if (c.status === 'available' && orderAmount >= c.minOrderAmount) {
        usable.push(c);
      } else {
        unusable.push(c);
      }
    }
    return { usable, unusable };
  }, [coupons, orderAmount]);

  const renderRow = (coupon: ClientCoupon, disabled: boolean) => {
    const active = selectedCode === coupon.code;
    const saving = estimateSaving(coupon, orderAmount);
    const daysLeft = couponDaysLeft(coupon.endAt);
    const gap = Math.max(0, coupon.minOrderAmount - orderAmount);
    return (
      <Pressable
        key={coupon.id}
        onPress={() => {
          if (disabled) return; // 不可用禁点（D4：弱网下避免反复试错等 preview 报错）
          onSelect(coupon.code);
          onClose();
        }}
        style={[
          styles.ticket,
          {
            backgroundColor: disabled ? colors['surface-container-low'] : colors.surface,
            borderColor: active && !disabled ? colors.primary : colors['outline-variant'],
            borderWidth: active && !disabled ? 2 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${coupon.name} ${coupon.code}`}
        accessibilityState={disabled ? { disabled: true } : undefined}
      >
        {/* 左栏（原型 compact-left：折扣主值 + 门槛） */}
        <View
          style={[
            styles.left,
            {
              backgroundColor: disabled
                ? colors['surface-container']
                : colors['primary-container'],
              borderRightColor: disabled ? colors['outline-variant'] : colors.primary,
            },
          ]}
        >
          <Text
            style={[
              styles.leftValue,
              { color: disabled ? colors['on-surface-variant'] : colors['on-primary-container'] },
            ]}
          >
            {formatCouponValue(coupon, t)}
          </Text>
          <Text
            style={[
              styles.leftMin,
              { color: disabled ? colors['on-surface-variant'] : colors['on-primary-container'] },
            ]}
          >
            {t('coupons.minSpendShort', { amount: coupon.minOrderAmount })}
          </Text>
        </View>
        {/* 右栏（原型 compact-body：券名 + 本单预计省 · 剩 N 天 / 不可用差额 chip） */}
        <View style={styles.body}>
          <Text
            style={[styles.name, { color: disabled ? colors['on-surface-variant'] : colors['on-surface'] }]}
            numberOfLines={1}
          >
            {coupon.name}
          </Text>
          {disabled ? (
            orderAmount < coupon.minOrderAmount ? (
              // MIN_NOT_MET：还差 $X 可用（唯一可前置判断的原因；scope 等后端字段）
              <View
                style={[
                  styles.chip,
                  { backgroundColor: colors.semantic['warning-container'] },
                ]}
              >
                <Text style={[styles.chipText, { color: colors.semantic.warning }]}>
                  {t('coupons.needMore', {
                    amount: Math.ceil(gap * 100) / 100,
                    defaultValue: '再买 ${{amount}} 可用',
                  })}
                </Text>
              </View>
            ) : (
              <Text style={[styles.meta, { color: colors['on-surface-variant'] }]}>
                {t('coupons.notAvailable', { defaultValue: '本单不可用' })}
              </Text>
            )
          ) : (
            <Text style={[styles.meta, { color: colors['on-surface-variant'] }]} numberOfLines={1}>
              {saving > 0
                ? `${t('coupons.saveThisOrder', { amount: Math.ceil(saving * 100) / 100, defaultValue: '本单预计省 ${{amount}}' })} · `
                : ''}
              {daysLeft > 0
                ? t('coupons.daysLeft', { count: daysLeft })
                : t('coupons.expiresToday')}
            </Text>
          )}
        </View>
        {active && !disabled && (
          <View style={styles.check}>
            <Icon symbol="check_circle" size={20} color={colors.primary} />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} onClose={onClose} title={t('checkout.coupon.title')} testID={testID}>
      <ScrollView style={styles.list} contentContainerStyle={{ gap: spacing.sm }}>
        {/* 不使用券（D4：保持最上方） */}
        <Pressable
          onPress={() => {
            onSelect(undefined);
            onClose();
          }}
          style={[
            styles.noneRow,
            {
              backgroundColor: colors['surface-container-low'],
              borderColor: !selectedCode ? colors.primary : colors['outline-variant'],
              borderWidth: !selectedCode ? 2 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('checkout.coupon.none')}
        >
          <Text style={[styles.noneText, { color: colors['on-surface'] }]}>
            {t('checkout.coupon.none')}
          </Text>
          {!selectedCode && <Icon symbol="check_circle" size={20} color={colors.primary} />}
        </Pressable>

        {/* 本单可用 */}
        {usable.length > 0 && (
          <>
            <Text style={[styles.sectionHead, { color: colors['on-surface-variant'] }]}>
              {t('coupons.usableThisOrder', { defaultValue: '本单可用' })}
            </Text>
            {usable.map((c) => renderRow(c, false))}
          </>
        )}

        {/* 本单不可用（置灰禁点，原因可见） */}
        {unusable.length > 0 && (
          <>
            <Text style={[styles.sectionHead, { color: colors['on-surface-variant'] }]}>
              {t('coupons.unusableThisOrder', { defaultValue: '本单不可用' })}
            </Text>
            {unusable.map((c) => renderRow(c, true))}
          </>
        )}

        {coupons.length === 0 && (
          <Text style={[styles.empty, { color: colors['on-surface-variant'] }]}>
            {t('checkout.coupon.empty')}
          </Text>
        )}
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 420 },
  noneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  noneText: { ...typography['body-md'], fontWeight: '600' },
  sectionHead: {
    ...typography['label-caps'],
    fontSize: 11,
    marginTop: spacing.xs,
  },
  ticket: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: borderRadius.md + 2,
    overflow: 'hidden',
    minHeight: 72,
  },
  left: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.sm + 2,
    borderRightWidth: 1,
    borderStyle: 'dashed',
  },
  leftValue: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  leftMin: {
    fontSize: 9,
    textAlign: 'center',
    opacity: 0.85,
  },
  body: {
    flex: 1,
    minWidth: 0,
    padding: spacing.sm + 2,
    gap: 4,
    justifyContent: 'center',
  },
  name: {
    ...typography['body-md'],
    fontSize: 14,
    fontWeight: '700',
  },
  meta: {
    fontSize: 11,
    lineHeight: 15,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  check: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { ...typography['body-md'], textAlign: 'center', paddingVertical: spacing.lg },
});
