// 购物车页底部栏（业务增强批3 拆分：从 app/(main)/cart.tsx 原样搬移，行为零变更）
// 管理态显删除栏（§4.3），默认显结算栏（§3.4 锁定，仅去 discount 行）
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets } from '@/theme';
import { Checkbox } from '@/components/ui/Checkbox';
import { PriceText } from '@/components/ui/PriceText';
import { formatPrice } from '@/utils/format';
import { ON_PRIMARY } from '../shared';

export function BottomBar({
  manageMode,
  allForDelete,
  toggleAllForDelete,
  deleteSelected,
  selectedCount,
  allSelected,
  toggleAll,
  totalPrice,
  discountAmount,
  totalItems,
  isOffline,
  soldOutCount = 0,
}: {
  manageMode: boolean;
  allForDelete: boolean;
  toggleAllForDelete: () => void;
  deleteSelected: () => void;
  selectedCount: number;
  allSelected: boolean;
  toggleAll: () => void;
  totalPrice: number;
  discountAmount: number;
  totalItems: number;
  isOffline: boolean;
  /** 断货件数（库存感知批：>0 时结算栏显示提示行） */
  soldOutCount?: number;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  if (manageMode) {
    return (
      <View
        style={[
          styles.checkoutBar,
          {
            backgroundColor: colors['surface-container-lowest'],
            borderColor: colors['outline-variant'],
          },
          shadowPresets.md,
        ]}
      >
        {/* 左：全选按钮（替「已选 X 件」文本）；右：DELETE 按钮（带 count，spacer 顶到最右） */}
        <Checkbox
          checked={allForDelete}
          onPress={toggleAllForDelete}
          label={t('common.all')}
          accessibilityLabel={t('cart.selectAllLabel')}
        />
        <View style={styles.barSpacer} />
        <Pressable
          onPress={deleteSelected}
          disabled={selectedCount === 0}
          style={({ pressed }) => [
            styles.deleteBtnBar,
            { backgroundColor: colors.error },
            pressed && selectedCount > 0 && { transform: [{ scale: 0.98 }] },
            selectedCount === 0 && { opacity: 0.5 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('cart.deleteSelected')}
        >
          <Text style={styles.deleteBtnBarText}>
            {t('cart.deleteSelected').toUpperCase()} ({selectedCount})
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.checkoutBar,
        {
          backgroundColor: colors['surface-container-lowest'],
          borderColor: colors['outline-variant'],
        },
        shadowPresets.md,
      ]}
    >
      {/* 全选 checkbox — U4 改方形 Checkbox 组件，与商品行视觉统一 */}
      <Checkbox
        checked={allSelected}
        onPress={toggleAll}
        label={t('common.all')}
        accessibilityLabel={t('cart.selectAllLabel')}
      />

      {/* 20261114 库存感知批：有断货项时提示（拍板 B——已自动取消勾选，此处仅解释性提示） */}
      {soldOutCount > 0 && (
        <Text style={[styles.soldOutNote, { color: colors.semantic.error }]}>
          {t('cart.soldOutNote', { count: soldOutCount })}
        </Text>
      )}

      {/* 合计：有折扣时显示 DISCOUNT 行（后端 cart.discountAmount 有值才显示，无值隐藏） */}
      <View style={styles.totalBox}>
        <View style={styles.totalRow}>
          <Text style={[styles.selectedLabel, { color: colors['on-surface-variant'] }]}>
            {t('cart.selectedTotal')}
          </Text>
          {/* V24：合计对齐原型 Georgia 18px（PriceText lg 是 sans 20，此处行内覆盖字体） */}
          <PriceText value={Math.max(0, totalPrice)} size="lg" style={styles.totalPriceSerif} />
        </View>
        {discountAmount > 0 && (
          <View style={[styles.totalRow, { marginTop: 4 }]}>
            <Text
              style={[
                styles.discountPill,
                {
                  color: colors.semantic.positive,
                  backgroundColor: colors.semantic['positive-container'],
                },
              ]}
            >
              {t('cart.discount')}
            </Text>
            <Text style={[styles.discountAmount, { color: colors.semantic.positive }]}>
              {/* F4：formatPrice 统一货币符 + sign 档（审查 P1-1：无 sign 档负值走 abs 丢负号，
                  必须显式 { sign: true } 产出 -$5.00，同 P3 优化原型 discount-pill） */}
              {formatPrice(-discountAmount, 'USD', 2, { sign: true })}
            </Text>
          </View>
        )}
      </View>

      {/* CHECKOUT 按钮 */}
      <Pressable
        onPress={() => router.push('/order/checkout')}
        disabled={totalItems === 0 || isOffline}
        style={({ pressed }) => [
          styles.checkoutBtn,
          { backgroundColor: colors.primary },
          pressed && { transform: [{ scale: 0.98 }] },
          (totalItems === 0 || isOffline) && { opacity: 0.5 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('cart.checkout')}
      >
        <Text style={styles.checkoutText}>{t('cart.checkout').toUpperCase()}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  checkoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout['container-margin'],
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalBox: {
    flex: 1,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedLabel: {
    fontSize: 12,
  },
  // 断货提示行（库存感知批）：结算栏内小红字
  soldOutNote: {
    fontSize: 10,
    fontWeight: '600',
  },

  // V5 DISCOUNT 行样式（有折扣时显示）
  discountPill: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  discountAmount: {
    fontSize: 12,
    fontWeight: '700',
  },
  // V24：合计 Georgia 18px（原型 .checkout-bar .total）
  totalPriceSerif: {
    fontFamily: '',
    fontSize: 16,
    lineHeight: 22,
  },
  // §4.3 管理态删除栏
  barSpacer: {
    flex: 1, // Why: 把 DELETE 按钮顶到底部栏最右侧（同结算栏 totalBox 的作用）
  },
  deleteBtnBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    ...shadowPresets.md,
  },
  deleteBtnBarText: {
    color: ON_PRIMARY,
    ...typography['label-caps'],
    fontWeight: '700',
  },
  checkoutBtn: {
    // V24：对齐原型 padding 14/24（原 lg/sm=24/8 偏矮）
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md - 2,
    borderRadius: borderRadius.md,
    ...shadowPresets.md,
  },
  checkoutText: {
    color: ON_PRIMARY,
    ...typography['label-caps'],
    fontWeight: '700',
  },
});
