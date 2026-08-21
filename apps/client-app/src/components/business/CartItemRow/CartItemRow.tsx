import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme, textStyle, spacing, borderRadius } from '@/theme';
import { useLocalizer } from '@/i18n';
import { PriceText } from '@/components/ui/PriceText';
import { Checkbox } from '@/components/ui/Checkbox';
import type { CartItemRowProps } from './CartItemRow.types';

function CartItemRowBase({
  item,
  onPress,
  onItemPress,
  onQuantityChange,
  onDelete,
  checkedOverride,
  showControls = true,
  testID,
}: CartItemRowProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const localize = useLocalizer();
  const { product, quantity, selected, spec } = item;
  const name = localize(product.name);
  const isChecked = checkedOverride ?? selected;

  return (
    <View
      testID={testID}
      style={[
        styles.row,
        {
          backgroundColor: colors['surface-container-lowest'],
          borderColor: colors['outline-variant'],
        },
      ]}
    >
      {showControls && (
        <Checkbox
          checked={isChecked}
          onPress={() => onPress?.(item)}
          accessibilityLabel={t('cart.a11y.selectItem')}
        />
      )}
      {/* Why: 外层用 View 而非 Pressable，避免 Pressable 嵌套 Pressable
          （RN Web 渲染为 <button> 嵌套 <button>，违反 HTML 规范导致 hydration 错误） */}
      <Pressable
        onPress={onItemPress ? () => onItemPress(item) : undefined}
        disabled={!onItemPress}
        style={({ pressed }) => [styles.mainContent, pressed && { opacity: 0.85 }]}
        accessibilityRole={onItemPress ? 'button' : undefined}
        accessibilityLabel={onItemPress ? t('cart.a11y.viewItem', { name }) : undefined}
      >
        <View style={[styles.imageWrap, { backgroundColor: colors['surface-container'] }]}>
          <Image source={{ uri: product.image }} style={styles.image} accessible={false} />
        </View>
        <View style={styles.info}>
          <Text
            style={[textStyle('body-md'), { fontWeight: '700', color: colors['on-surface'] }]}
            numberOfLines={2}
          >
            {name}
          </Text>
          {/* 审查 Q1：去掉 product.category 行（mock 是英文 slug、real 是 uuid，均不可读；
              名字+规格+价格已够，购物车行不需要分类） */}
          {/* 规格行：有 spec（如「500g」「大份」）才显示，无则隐藏 */}
          {spec ? (
            <Text style={[textStyle('label-caps'), { fontSize: 10, color: colors.primary }]}>
              {spec}
            </Text>
          ) : null}
          <View style={styles.bottomRow}>
            <PriceText value={product.price} size="sm" />
            {!showControls && (
              <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
                × {quantity}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
      {showControls && onQuantityChange && (
        <View style={[styles.qtyRow, { backgroundColor: colors['surface-container'] }]}>
          <Pressable
            onPress={() => onQuantityChange(Math.max(1, quantity - 1))}
            hitSlop={8}
            style={styles.qtyBtn}
            accessibilityRole="button"
            accessibilityLabel={t('cart.a11y.decreaseQty')}
          >
            <MaterialCommunityIcons name="minus" size={18} color={colors.primary} />
          </Pressable>
          <Text
            style={[textStyle('body-sm'), { color: colors['on-surface'], fontWeight: '700' }]}
          >
            {quantity}
          </Text>
          <Pressable
            onPress={() => onQuantityChange(quantity + 1)}
            hitSlop={8}
            style={styles.qtyBtn}
            accessibilityRole="button"
            accessibilityLabel={t('cart.a11y.increaseQty')}
          >
            <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
          </Pressable>
        </View>
      )}
      {/* 管理态：最右侧删除按钮（onDelete 由 cart.tsx 管理态传入，默认态不传→不显示） */}
      {showControls && onDelete && (
        <Pressable
          onPress={() => onDelete(item)}
          hitSlop={8}
          style={styles.deleteBtn}
          accessibilityRole="button"
          accessibilityLabel={t('cart.a11y.deleteItem')}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
        </Pressable>
      )}
    </View>
  );
}

export const CartItemRow = memo(CartItemRowBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  imageWrap: {
    // V7：对齐原型 .item-img-wrap 72px（原 64）
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  info: { flex: 1, gap: 4 },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: 2,
  },
  qtyBtn: {
    // V7：对齐原型 .stepper button 32px（原 28）
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
