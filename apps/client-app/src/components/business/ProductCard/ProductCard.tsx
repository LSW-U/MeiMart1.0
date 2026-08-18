import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme, textStyle, spacing, borderRadius, shadowPresets } from '@/theme';
import { useLocalizer } from '@/i18n';
import { formatPrice } from '@/utils/format';

import { PriceText } from '@/components/ui/PriceText';
import { Button } from '@/components/ui/Button';
import type { ProductBadge, ProductBadgeVariant, ProductCardProps } from './ProductCard.types';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';

type BadgeColorEntry = { bg: string; fg: string; pill?: boolean };

// Why: badge 配色从 useTheme 派生（dark mode 自动适配），不再用模块级硬编码常量。
// top-rated 映射到 semantic.warning (#F57C00，旧 #f59e0b 偏黄)，肉眼可辨色变。
function useBadgeColors(): Record<ProductBadgeVariant, BadgeColorEntry> {
  const { colors } = useTheme();
  return {
    fresh: { bg: colors.semantic.success, fg: colors['on-primary'] },
    'best-seller': { bg: colors.primary, fg: colors['on-primary'] },
    new: { bg: colors.tertiary, fg: colors['on-primary'] },
    'top-rated': { bg: colors.semantic.warning, fg: colors['on-primary'] },
    local: { bg: `${colors.primary}1A`, fg: colors.primary, pill: true }, // 1A = ~10% opacity
  };
}

function BadgeCorner({ badge, entry }: { badge: ProductBadge; entry: BadgeColorEntry }) {
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: entry.bg,
          borderRadius: entry.pill ? 999 : 2,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            color: entry.fg,
          },
        ]}
      >
        {badge.label}
      </Text>
    </View>
  );
}

function ProductCardBase({
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
  const { t } = useTranslation();
  const badgeColors = useBadgeColors();
  const localize = useLocalizer();
  const name = localize(product.name);

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: colors['surface-container-lowest'],
          borderColor: colors['outline-variant'],
        },
        shadowPresets.sm,
      ]}
    >
      {/* Why: 外层用 View 而非 Pressable，避免 Pressable 嵌套 Pressable
          （RN Web 渲染为 <button> 嵌套 <button>，违反 HTML 规范导致 hydration 错误） */}
      <Pressable
        style={({ pressed }) => [styles.clickableArea, pressed && styles.pressed]}
        onPress={onPress ? () => onPress(product) : undefined}
        accessibilityRole="button"
        accessibilityLabel={`${name}, price ${formatPrice(product.price)}`}
      >
        <View style={[styles.imageWrap, { backgroundColor: colors['surface-container-lowest'] }]}>
          <SafeImage source={{ uri: product.image }} style={styles.image} accessible={false} />
          {badge && <BadgeCorner badge={badge} entry={badgeColors[badge.variant]} />}
        </View>
        <View style={styles.info}>
          <Text
            style={[textStyle('body-sm'), { fontWeight: '700', color: colors['on-surface'] }]}
            numberOfLines={2}
          >
            {name}
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
                  · {product.salesCount} {t('product.sold')}
                </Text>
              )}
            </View>
          )}
        </View>
      </Pressable>

      {showFavorite && (
        <Pressable
          style={[styles.favoriteBtn, { backgroundColor: colors['surface-container-lowest'] }]}
          onPress={onFavoritePress ? () => onFavoritePress(product) : undefined}
          accessibilityRole="button"
          accessibilityLabel={
            isFavorite
              ? t('product.removeFromFavorites', { defaultValue: 'Remove from favorites' })
              : t('product.addToFavorites', { defaultValue: 'Add to favorites' })
          }
        >
          <MaterialCommunityIcons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={18}
            color={isFavorite ? colors.primary : colors['on-surface-variant']}
          />
        </Pressable>
      )}

      {onAddToCart && (
        <View style={styles.addToCartWrap}>
          <Button
            label={t('product.addToCart')}
            variant="outline"
            size="sm"
            onPress={() => onAddToCart(product)}
          />
        </View>
      )}
    </View>
  );
}

export const ProductCard = memo(ProductCardBase);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'relative',
  },
  clickableArea: {
    flex: 1,
  },
  pressed: {
    opacity: 0.85,
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
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
    // Why: P19 D8 收口 —— 底色从 rgba(255,255,255,0.8) 改 surface-container-lowest token（dark 跟随）
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
  addToCartWrap: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
});
