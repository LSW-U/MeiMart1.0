import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, textStyle, spacing, borderRadius } from '@/theme';
import { Button } from '@/components/ui/Button';
import type { CouponCardProps } from './CouponCard.types';

export function CouponCard({ coupon, onPress, onUse, testID }: CouponCardProps) {
  const { colors } = useTheme();
  const discountLabel =
    coupon.type === 'percentage' ? `${coupon.discount}% OFF` : `${coupon.discount} OFF`;
  const isValid = new Date(coupon.validUntil) > new Date() && !coupon.used;

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
          Min spend ${coupon.minPurchase}
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
          Exp: {new Date(coupon.validUntil).toLocaleDateString()}
        </Text>
        {coupon.used && (
          <Text style={[textStyle('label-caps'), { color: colors['on-surface-variant'] }]}>
            Used
          </Text>
        )}
        {!coupon.used && onUse && isValid && (
          <Button label="Use Now" variant="text" size="sm" onPress={() => onUse(coupon)} />
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
