import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, textStyle, spacing, borderRadius } from '@/theme';
import { PriceText } from '@/components/ui/PriceText';
import type { ProductItemProps } from './ProductItem.types';

export function ProductItem({
  item,
  onPress,
  layout = 'row',
  onIncrease,
  onDecrease,
  testID,
}: ProductItemProps) {
  const { colors } = useTheme();
  const { product, quantity } = item;
  const isCart = layout === 'cart';

  return (
    <Pressable
      testID={testID}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors['surface-container-lowest'] },
        pressed && styles.pressed,
      ]}
      onPress={onPress ? () => onPress(item) : undefined}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, quantity ${quantity}, price ${product.price}`}
    >
      <Image source={{ uri: product.image }} style={styles.image} accessible={false} />
      <View style={styles.info}>
        <Text
          style={[textStyle('body-sm'), { fontWeight: '700', color: colors['on-surface'] }]}
          numberOfLines={2}
        >
          {product.name}
        </Text>
        <Text
          style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}
          numberOfLines={1}
        >
          {product.category}
        </Text>
        <View style={styles.bottomRow}>
          <PriceText value={product.price} originalPrice={product.originalPrice} size="sm" />
          {isCart ? (
            <View style={styles.qtyControls}>
              <Pressable
                onPress={onDecrease ? () => onDecrease(item) : undefined}
                style={styles.qtyBtn}
                accessibilityRole="button"
                accessibilityLabel={`Decrease ${product.name} quantity`}
              >
                <MaterialCommunityIcons
                  name="minus-circle-outline"
                  size={20}
                  color={colors.primary}
                />
              </Pressable>
              <Text
                style={[textStyle('body-sm'), { color: colors['on-surface'], fontWeight: '700' }]}
              >
                {quantity}
              </Text>
              <Pressable
                onPress={onIncrease ? () => onIncrease(item) : undefined}
                style={styles.qtyBtn}
                accessibilityRole="button"
                accessibilityLabel={`Increase ${product.name} quantity`}
              >
                <MaterialCommunityIcons
                  name="plus-circle-outline"
                  size={20}
                  color={colors.primary}
                />
              </Pressable>
            </View>
          ) : (
            <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
              × {quantity}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  pressed: { opacity: 0.85 },
  image: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  info: { flex: 1, justifyContent: 'space-between' },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  qtyBtn: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
