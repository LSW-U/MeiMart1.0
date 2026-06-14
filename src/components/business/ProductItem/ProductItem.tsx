import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, textStyle, spacing, borderRadius } from '@/theme';
import { PriceText } from '@/components/ui/PriceText';
import type { ProductItemProps } from './ProductItem.types';

export function ProductItem({ item, onPress, testID }: ProductItemProps) {
  const { colors } = useTheme();
  const { product, quantity } = item;

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
          <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
            × {quantity}
          </Text>
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
    borderRadius: borderRadius.md,
  },
  pressed: { opacity: 0.85 },
  image: { width: 72, height: 72, borderRadius: borderRadius.sm },
  info: { flex: 1, justifyContent: 'space-between' },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
});
