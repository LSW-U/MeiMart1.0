import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useTheme, spacing, borderRadius, typography, shadowPresets } from '@/theme';
import { useTranslation } from 'react-i18next';
import { useLocalizer } from '@/i18n';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';
import { PriceText } from '@/components/ui/PriceText';
import { Icon } from '@/components/ui/Icon';
import type { MasonryProductCardProps } from './MasonryProductCard.types';

// Why: 全局卡片统一方案 §9.3 - 瀑布流卡片
//   图片满宽 + 高度档位错落 + info（badge 叠图左上 + 名 + PriceText + 32² 圆形 add）
//   ⚠️ 无 HTML 原型（home 推荐横滑 -> 瀑布流是方案改版），按方案 §9.4-B 手动两列 + 固定高度档位
// 原因：红底加购按钮上的固定白字，dark 不变（同 ON_PRIMARY 模式）
const ON_PRIMARY = '#ffffff';

// Why: 方案 §9.4-B - 固定高度档位（3 档错落，无需 Image.getSize 异步取宽高比）
const HEIGHT_VARIANTS = [140, 168, 120];

export function MasonryProductCard({
  product,
  onPress,
  onLongPress,
  onAddToCart,
  badge,
  testID,
}: MasonryProductCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const localize = useLocalizer();
  const name = localize(product.name);
  // Why: 按 id charCode 选高度档位（稳定，同商品总同高度，避免切换重排）
  const heightIdx = product.id.charCodeAt(0) % HEIGHT_VARIANTS.length;
  const imageHeight = HEIGHT_VARIANTS[heightIdx];

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
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel={t('product.viewItem', { name })}
      >
        <View style={[styles.imageWrap, { height: imageHeight, backgroundColor: colors['surface-container'] }]}>
          <SafeImage source={{ uri: product.image }} style={styles.image} />
          {badge && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{badge.label}</Text>
            </View>
          )}
        </View>
      </Pressable>
      <View style={styles.info}>
        <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          <Text style={[styles.name, { color: colors['on-surface'] }]} numberOfLines={2}>
            {name}
          </Text>
        </Pressable>
        <View style={styles.bottomRow}>
          <PriceText value={product.price} originalPrice={product.originalPrice} size="sm" />
          <Pressable
            onPress={onAddToCart}
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('product.addToCartLabel', { name })}
          >
            <Icon symbol="add" size={18} color={ON_PRIMARY} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageWrap: {
    width: '100%',
  },
  image: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: { ...typography['label-caps'], fontSize: 10, fontWeight: '700', color: '#ffffff' },
  info: { padding: spacing.sm, gap: spacing.xs },
  name: { ...typography['body-sm'], fontWeight: '600', minHeight: 32 },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
