import { ActivityIndicator, Pressable, View, Text, StyleSheet } from 'react-native';
import { useTheme, spacing, borderRadius, typography, shadowPresets } from '@/theme';
import { useTranslation } from 'react-i18next';
import { useLocalizer } from '@/i18n';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';
import { PriceText } from '@/components/ui/PriceText';
import { Icon } from '@/components/ui/Icon';
import type { HorizontalProductCardProps } from './HorizontalProductCard.types';

// Why: 全局卡片统一方案 §9 - 横向卡（categories Hot + product/list 共用）
//   左图 72² + 右信息（badge + 名 + 评分 + PriceText）+ 32² 圆形 add
//   image/name 各自 Pressable 跳详情，add 独立 Pressable（避免嵌套，同 P0 模式）
// 原因：红底加购按钮上的固定白字，dark 不变（同 ON_PRIMARY 模式）
const ON_PRIMARY = '#ffffff';

export function HorizontalProductCard({
  product,
  onPress,
  onAddToCart,
  badge,
  showRating = false,
  addPending = false,
  addDisabled = false,
  selectMode = false,
  isSelected = false,
  testID,
}: HorizontalProductCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const localize = useLocalizer();
  const name = localize(product.name);

  // Why: 管理态整卡单 Pressable（图片+信息+圆圈全可点，无嵌套：内层 image/name 均降级 View）；
  //      常态保持分区可点（image/name 各自 Pressable 跳详情，add 独立——P0 模式）
  const cardContent = (
    <>
      {selectMode ? (
        <View style={styles.imageWrap}>
          <SafeImage source={{ uri: product.image }} style={styles.image} />
        </View>
      ) : (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel={t('product.viewItem', { name })}
        >
          <View style={styles.imageWrap}>
            <SafeImage source={{ uri: product.image }} style={styles.image} />
          </View>
        </Pressable>
      )}
      <View style={styles.info}>
        {/* Why: badge inline 渲染（§9-5 统一为 resolveBadges 派生），primary tint 背景；
            管理态隐藏（选择优先，与 Masonry 管理态一致） */}
        {badge && !selectMode && (
          <View style={[styles.badge, { backgroundColor: colors.primary + '1F' /* 原因：primary 12% tint 背景（8位 hex #RRGGBBAA，'1F'≈12% alpha，审查 Q3） */ }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>{badge.label}</Text>
          </View>
        )}
        {selectMode ? (
          <View>
            <Text style={[styles.name, { color: colors['on-surface'] }]} numberOfLines={2}>
              {name}
            </Text>
          </View>
        ) : (
          <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            <Text style={[styles.name, { color: colors['on-surface'] }]} numberOfLines={2}>
              {name}
            </Text>
          </Pressable>
        )}
        {showRating && typeof product.rating === 'number' && (
          <View style={styles.ratingRow}>
            <Icon symbol="star" size={14} color={colors.tertiary} />
            <Text style={[styles.rating, { color: colors['on-surface-variant'] }]}>
              {product.rating.toFixed(1)}
            </Text>
            {typeof product.salesCount === 'number' && (
              <Text style={[styles.sales, { color: colors['on-surface-variant'] }]}>
                · {product.salesCount} {t('product.sold')}
              </Text>
            )}
          </View>
        )}
        <PriceText value={product.price} originalPrice={product.originalPrice} size="md" />
      </View>
      {selectMode ? (
        // Why: 管理态加购位换选择圆圈（P19 原型 .select-circle）——纯状态展示，
        //      点击由整卡 Pressable 接管（toggleSelect）
        <View
          style={[
            styles.selectCircle,
            {
              backgroundColor: isSelected ? colors.primary : colors['surface-container-lowest'],
              borderColor: isSelected ? colors.primary : colors['outline-variant'],
            },
          ]}
        >
          {isSelected && <Icon symbol="check" size={14} color={colors['on-primary']} />}
        </View>
      ) : (
        <Pressable
          onPress={onAddToCart}
          disabled={addPending || addDisabled}
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: colors.primary, opacity: addPending || addDisabled ? 0.6 : 1 },
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('product.addToCartLabel', { name })}
          accessibilityState={
            addPending || addDisabled ? { disabled: true } : undefined
          }
        >
          {addPending ? (
            // P19 D4：加购进行中用 spinner 占位（复用 add 按钮位，尺寸与 icon 对齐）；
            // addDisabled（他卡单飞行期）不转 spinner 只禁点（审查 Q4 拆分语义）
            <ActivityIndicator size="small" color={ON_PRIMARY} />
          ) : (
            <Icon symbol="add" size={18} color={ON_PRIMARY} />
          )}
        </Pressable>
      )}
    </>
  );

  if (selectMode) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors['surface-container-lowest'],
            borderColor: isSelected ? colors.primary : colors['outline-variant'],
          },
          isSelected && styles.cardSelected,
          shadowPresets.sm,
          pressed && { opacity: 0.85 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('product.viewItem', { name })}
        accessibilityState={isSelected ? { selected: true } : undefined}
      >
        {cardContent}
      </Pressable>
    );
  }

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
      {cardContent}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  // Why: 选中态 2px primary 边（与 Masonry 管理态一致，P19 .selected-card）
  cardSelected: {
    borderWidth: 2,
  },
  imageWrap: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  info: { flex: 1, gap: spacing.xs },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: { ...typography['label-caps'], fontSize: 10, fontWeight: '700' },
  // Why: 方案 §2.2 - 名 body-sm/600/on-surface，numberOfLines 2
  name: { ...typography['body-sm'], fontWeight: '600', minHeight: 36 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: { ...typography['body-sm'] },
  sales: { ...typography['body-sm'] },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Why: 管理态选择圆圈（P19 .select-circle 22²，与 Masonry 同款；占加购位保行高稳定）
  selectCircle: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
