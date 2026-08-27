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
  selectMode = false,
  isSelected = false,
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
          borderColor: selectMode && isSelected ? colors.primary : colors['outline-variant'],
        },
        selectMode && isSelected && styles.cardSelected,
        shadowPresets.sm,
      ]}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel={t('product.viewItem', { name })}
        accessibilityState={isSelected ? { selected: true } : undefined}
      >
        <View style={[styles.imageWrap, { height: imageHeight, backgroundColor: colors['surface-container'] }]}>
          <SafeImage source={{ uri: product.image }} style={styles.image} />
          {badge && !selectMode && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{badge.label}</Text>
            </View>
          )}
          {/* Why: P19 原型 .select-circle —— 管理态右上角选择圆圈（选中 primary 底白勾） */}
          {selectMode && (
            <View
              style={[
                styles.selectCircle,
                {
                  backgroundColor: isSelected ? colors.primary : colors['surface-container-lowest'],
                  borderColor: isSelected ? colors.primary : colors['outline-variant'],
                },
              ]}
            >
              {isSelected && <Icon symbol="check" size={13} color={colors['on-primary']} />}
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
          {selectMode ? (
            // Why: 管理态右侧位保持布局稳定（32² 与加购钮同尺寸），不可点（点按整卡走 onPress）
            <View style={styles.selectPlaceholder} />
          ) : (
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
          )}
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
  // Why: P19 原型 .selected-card —— 选中态 2px primary 边（原型 .selected-card{border-color:var(--primary)}）
  cardSelected: {
    borderWidth: 2,
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
  // Why: P19 原型 .select-circle —— 22² 圆圈右上角，白底 90% 透明 + outline 边；选中 primary 底
  selectCircle: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Why: 管理态占位与加购钮同尺寸（32²），保 bottomRow 布局稳定
  selectPlaceholder: {
    width: 32,
    height: 32,
  },
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
