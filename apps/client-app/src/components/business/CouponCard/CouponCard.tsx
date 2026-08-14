import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, textStyle, spacing, borderRadius } from '@/theme';
import { Button } from '@/components/ui/Button';
import { formatCouponValue } from '@/utils/coupon';
import type { CouponCardProps } from './CouponCard.types';

export function CouponCard({
  coupon,
  onPress,
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

  return (
    <Pressable
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isValid ? colors['primary-container'] : colors['surface-container-high'],
          borderColor: isValid ? colors.primary : colors['outline-variant'],
        },
        pressed && styles.pressed,
      ]}
      onPress={onPress ? () => onPress(coupon) : undefined}
      accessibilityRole="button"
      accessibilityLabel={`Coupon: ${coupon.name}, ${discountLabel}`}
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
          Min spend ${coupon.minOrderAmount}
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
        <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
          Exp: {new Date(coupon.endAt).toLocaleDateString()}
        </Text>
        {isUsed && (
          <Text style={[textStyle('label-caps'), { color: colors['on-surface-variant'] }]}>
            Used
          </Text>
        )}
        {isExpired && (
          <Text style={[textStyle('label-caps'), { color: colors['on-surface-variant'] }]}>
            Expired
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
            <Button label="Use Now" variant="text" size="sm" onPress={() => onUse(coupon)} />
          )
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.85 },
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
