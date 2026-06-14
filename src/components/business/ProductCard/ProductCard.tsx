import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, textStyle, spacing, borderRadius } from '@/theme';

import { PriceText } from '@/components/ui/PriceText';
import { Button } from '@/components/ui/Button';
import type { ProductCardProps } from './ProductCard.types';

export function ProductCard({ product, onPress, onAddToCart, testID }: ProductCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors['surface-container-low'],
          borderColor: colors['outline-variant'],
        },
        pressed && styles.pressed,
      ]}
      onPress={onPress ? () => onPress(product) : undefined}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, price ${product.price}`}
    >
      <Image source={{ uri: product.image }} style={styles.image} accessible={false} />
      <View style={styles.info}>
        <Text
          style={[textStyle('body-sm'), { fontWeight: '700', color: colors['on-surface'] }]}
          numberOfLines={2}
        >
          {product.name}
        </Text>
        <PriceText value={product.price} originalPrice={product.originalPrice} size="md" />
        {typeof product.rating === 'number' && (
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="star" size={12} color={colors.tertiary} />
            <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
              {product.rating.toFixed(1)}
            </Text>
            {typeof product.salesCount === 'number' && (
              <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
                · {product.salesCount} sold
              </Text>
            )}
          </View>
        )}
        {onAddToCart && (
          <Button
            label="Add to Cart"
            variant="outline"
            size="sm"
            onPress={() => onAddToCart(product)}
            style={styles.addToCartBtn}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: 'transparent',
  },
  info: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addToCartBtn: {
    marginTop: 4,
  },
});
