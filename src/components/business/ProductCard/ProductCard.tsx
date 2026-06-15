import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, textStyle, spacing, borderRadius, shadowPresets } from '@/theme';

import { PriceText } from '@/components/ui/PriceText';
import { Button } from '@/components/ui/Button';
import type { ProductBadge, ProductBadgeVariant, ProductCardProps } from './ProductCard.types';

const BADGE_COLORS: Record<ProductBadgeVariant, { bg: string; fg: string; pill?: boolean }> = {
  fresh: { bg: '#059669', fg: '#ffffff' }, // emerald-600
  'best-seller': { bg: '#961813', fg: '#ffffff' }, // primary
  new: { bg: '#634700', fg: '#ffffff' }, // tertiary
  'top-rated': { bg: '#f59e0b', fg: '#ffffff' }, // amber-500
  local: { bg: 'rgba(150,24,19,0.1)', fg: '#961813', pill: true }, // primary/10
};

function BadgeCorner({ badge }: { badge: ProductBadge }) {
  const colors = BADGE_COLORS[badge.variant];
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          borderRadius: colors.pill ? 999 : 2,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            color: colors.fg,
          },
        ]}
      >
        {badge.label}
      </Text>
    </View>
  );
}

export function ProductCard({
  product,
  onPress,
  onAddToCart,
  badge,
  showFavorite = false,
  isFavorite = false,
  onFavoritePress,
  testID,
}: ProductCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors['surface-container-lowest'],
          borderColor: colors['outline-variant'],
        },
        shadowPresets.sm,
        pressed && styles.pressed,
      ]}
      onPress={onPress ? () => onPress(product) : undefined}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, price ${product.price}`}
    >
      <View style={styles.imageWrap}>
        <Image source={{ uri: product.image }} style={styles.image} accessible={false} />
        {badge && <BadgeCorner badge={badge} />}
        {showFavorite && (
          <Pressable
            style={styles.favoriteBtn}
            onPress={onFavoritePress ? () => onFavoritePress(product) : undefined}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <MaterialCommunityIcons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavorite ? colors.primary : colors['on-surface-variant']}
            />
          </Pressable>
        )}
      </View>
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
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#ffffff',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    zIndex: 10,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  favoriteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  info: {
    padding: spacing.md,
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
