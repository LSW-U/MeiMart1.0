// 商品详情信息区：Header Info（双标签+标题+价格+库存+仓库+步进器）/ 断货 banner /
// Delivery 卡 / 规格选择器 / Details 图文卡
// 批5 拆分：从 app/product/[id].tsx 原样搬移，行为零变更
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, borderRadius, shadowPresets } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import { formatCompactNumber } from '@/utils/format';
import type { Product, LocalizableText } from '@/types';
import type { StockState } from '../shared';

type Localize = (text: LocalizableText) => string;

export function InfoSection({
  product,
  stockState,
  isSoldOut,
  variants,
  variantSelection,
  selectVariant,
  warehouseData,
  warehouseText,
  warehouseColor,
  quantity,
  qtyMax,
  decQty,
  incQty,
  defaultAddr,
  localize,
}: {
  product: Product;
  stockState: StockState;
  isSoldOut: boolean;
  variants: import('@/config/variantTemplates').VariantGroup[];
  variantSelection: Record<string, string>;
  selectVariant: (groupName: string, label: string) => void;
  warehouseData: import('@/types').WarehouseAvailability | null;
  warehouseText: string;
  warehouseColor: string;
  quantity: number;
  qtyMax: number;
  decQty: () => void;
  incQty: () => void;
  defaultAddr: { detail: string; district?: string | null } | undefined;
  localize: Localize;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <>
      {/* Header Info：双标签 + 标题 + 价格 + IN STOCK */}
      <View style={styles.headerInfo}>
        <View style={styles.tagRow}>
          <View style={[styles.tagTertiary, { backgroundColor: colors['tertiary-fixed'] }]}>
            <Text style={[styles.tagTertiaryText, { color: colors['on-tertiary-fixed-variant'] }]}>
              {t('product.tagLocal')}
            </Text>
          </View>
          {/* D3 批D：热销徽章消费批B isCategoryTop3（后端直出），替换原无条件硬编码展示；字段缺失不显示，宁缺毋假 */}
          {product.isCategoryTop3 && (
            <View style={[styles.tagPrimary, { backgroundColor: colors['primary-fixed'] }]}>
              <Text style={[styles.tagPrimaryText, { color: colors.primary }]}>
                {t('product.badgeBestSeller')}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.h1, { color: colors['on-surface'] }]}>{localize(product.name)}</Text>
        <View style={styles.priceRow}>
          <Text style={[styles.priceBig, { color: colors.primary }]}>
            ${product.price.toFixed(2)}
          </Text>
          {product.originalPrice && (
            <Text style={[styles.priceStrike, { color: colors.secondary }]}>
              ${product.originalPrice.toFixed(2)}
            </Text>
          )}
          {/* P3-1（批D 审查修复）：头部评分位，消费 product.rating —— 样式对齐 ProductCard metaRow（star 12 + toFixed(1)） */}
          {typeof product.rating === 'number' && (
            <View style={styles.ratingInline}>
              <Icon symbol="star" size={12} color={colors.tertiary} />
              <Text style={[styles.ratingInlineText, { color: colors['on-surface-variant'] }]}>
                {product.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
        {/* §7 库存 3 态：充足/未知绿点「有货」，紧张橙点「库存紧张」+ 红字仅剩；断货整块隐藏改 banner */}
        {!isSoldOut && (
          <View>
            <View
              style={[
                styles.stockRow,
                {
                  borderBottomColor: colors['outline-variant'],
                  borderTopColor: colors['outline-variant'],
                },
              ]}
            >
              <View style={styles.stockLeft}>
                <View
                  style={[
                    styles.stockDot,
                    {
                      backgroundColor:
                        stockState === 'low' ? colors.semantic.warning : colors.semantic.positive,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.stockText,
                    {
                      color:
                        stockState === 'low' ? colors.semantic.warning : colors.semantic.positive,
                    },
                  ]}
                >
                  {stockState === 'low' ? t('product.lowStock') : t('product.inStock')}
                </Text>
              </View>
              {/* §9 Q3 销量：字段有值才显示，不再写死 1.2k */}
              {product.salesCount != null && (
                <Text style={[styles.stockSold, { color: colors['on-surface-variant'] }]}>
                  {formatCompactNumber(product.salesCount)} {t('product.sold')}
                </Text>
              )}
            </View>
            {/* D5/D11 就近仓可用性（P2-2 三态）：按默认地址坐标查询；无数据（端点未部署门禁/无坐标/失败）整块隐藏不阻塞 */}
            {warehouseData && warehouseText !== '' && (
              <View style={styles.warehouseRow}>
                <Icon symbol="storefront" size={14} color={warehouseColor} />
                <Text style={[styles.warehouseText, { color: warehouseColor }]}>
                  {warehouseText}
                </Text>
              </View>
            )}
            {/* §11.1 紧张红字提示，放在步进器上方（与步进上限视觉关联） */}
            {stockState === 'low' && (
              <View style={styles.lowStockTip}>
                <Text style={styles.lowStockTipIcon}>⚠</Text>
                <Text style={[styles.lowStockTipText, { color: colors.semantic.error }]}>
                  {t('product.onlyLeft', { count: product.stock })}
                </Text>
              </View>
            )}
            {/* 数量步进器：+ 达 stock 禁用（§11.1），紧张态显示 / max 上限 */}
            <View style={styles.qtyRow}>
              <View style={styles.qtyLabelWrap}>
                <Text style={[styles.qtyLabel, { color: colors['on-surface'] }]}>
                  {t('product.quantity')}
                </Text>
                {stockState === 'low' && (
                  <Text style={[styles.qtyMax, { color: colors['on-surface-variant'] }]}>
                    / {t('product.stockMax', { max: product.stock })}
                  </Text>
                )}
              </View>
              <View
                style={[
                  styles.stepper,
                  {
                    borderColor: colors.outline,
                    backgroundColor: colors['surface-container-lowest'],
                  },
                ]}
              >
                <Pressable
                  onPress={decQty}
                  disabled={quantity <= 1}
                  style={styles.stepperBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('cart.a11y.decreaseQty')}
                >
                  <Text
                    style={[
                      styles.stepperBtnText,
                      { color: quantity <= 1 ? colors.outline : colors['on-surface'] },
                    ]}
                  >
                    −
                  </Text>
                </Pressable>
                <Text style={[styles.stepperVal, { color: colors['on-surface'] }]}>{quantity}</Text>
                <Pressable
                  onPress={incQty}
                  disabled={quantity >= qtyMax}
                  style={styles.stepperBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('cart.a11y.increaseQty')}
                >
                  <Text
                    style={[
                      styles.stepperBtnText,
                      { color: quantity >= qtyMax ? colors.outline : colors['on-surface'] },
                    ]}
                  >
                    +
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* §11.1 断货 banner：替代库存行 + 步进器，底部栏两键同步禁用 */}
      {isSoldOut && (
        <View
          style={[styles.soldOutBanner, { backgroundColor: colors.semantic['error-container'] }]}
        >
          <Text style={styles.soldOutIcon}>📦</Text>
          <Text style={[styles.soldOutTitle, { color: colors.semantic.error }]}>
            {t('product.soldOut')}
          </Text>
          <Text style={[styles.soldOutDesc, { color: colors['on-surface-variant'] }]}>
            {t('product.soldOutDesc')}
          </Text>
        </View>
      )}

      {/* Delivery Section — §9 Q2 接入 useAddresses，取默认地址；无地址显示「选择地址」可点击跳列表 */}
      <View style={styles.section}>
        <Pressable
          onPress={() => router.push('/address/list')}
          style={[styles.deliveryCard, { backgroundColor: colors['surface-container'] }]}
          accessibilityRole="button"
          accessibilityLabel={t('product.selectAddress')}
        >
          <View style={styles.deliveryRow}>
            <View style={styles.deliveryLeft}>
              <Icon symbol="local_shipping" size={24} color={colors.primary} />
              <View>
                <Text style={[styles.deliveryLabel, { color: colors.secondary }]}>
                  {t('product.deliverTo')}
                </Text>
                <Text style={[styles.deliveryAddress, { color: colors['on-surface'] }]}>
                  {defaultAddr
                    ? `${defaultAddr.detail}${defaultAddr.district ? `, ${defaultAddr.district}` : ''}`
                    : t('product.selectAddress')}
                </Text>
              </View>
            </View>
            <Icon symbol="chevron_right" size={24} color={colors.outline} />
          </View>
          <View style={[styles.deliverySplit, { borderTopColor: colors['outline-variant'] }]}>
            <View style={styles.deliveryCell}>
              <Text style={[styles.deliveryLabel, { color: colors.secondary }]}>
                {t('product.eta')}
              </Text>
              <Text style={[styles.deliveryValue, { color: colors['on-surface'] }]}>
                {t('product.etaValue')}
              </Text>
            </View>
            <View style={styles.deliveryCell}>
              <Text style={[styles.deliveryLabel, { color: colors.secondary }]}>
                {t('product.shipping')}
              </Text>
              <Text style={[styles.deliveryValue, { color: colors.primary, fontWeight: '700' }]}>
                {t('product.shippingFree')}
              </Text>
            </View>
          </View>
        </Pressable>
      </View>

      {/* §9 Q1 规格选择器：按 category 从 variantTemplates 查；无规格则整体隐藏（§11.4） */}
      {variants.length > 0 && (
        <View style={styles.section}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
              {t('product.selectVariant')}
            </Text>
          </View>
          {variants.map((group) => {
            // C-P3-7（批4）：variantTemplates name/label 现为 i18n key，展示层 t() 解析
            //（原硬编码英文直接渲染；variantSelection 仍按原始 key 索引，选中态不受影响）
            const groupName = t(group.name);
            const selectedLabel =
              variantSelection[group.name] ?? group.options.find((o) => !o.disabled)?.label;
            return (
              <View key={group.name} style={styles.variantGroup}>
                <Text style={[styles.variantGroupName, { color: colors['on-surface-variant'] }]}>
                  {groupName}
                </Text>
                <View style={styles.grindRow}>
                  {group.options.map((opt) => {
                    const active = opt.label === selectedLabel;
                    return (
                      <Pressable
                        key={opt.label}
                        onPress={() => !opt.disabled && selectVariant(group.name, opt.label)}
                        disabled={opt.disabled}
                        style={[
                          styles.grindPill,
                          {
                            backgroundColor: active
                              ? colors.primary
                              : colors['surface-container-lowest'],
                            borderColor: active ? colors.primary : colors.outline,
                            opacity: opt.disabled ? 0.4 : 1,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active, disabled: opt.disabled }}
                        accessibilityLabel={t('product.a11y.variantOption', {
                          group: groupName,
                          option: t(opt.label),
                        })}
                      >
                        <Text
                          style={[
                            styles.grindText,
                            {
                              color: active ? colors['on-primary'] : colors['on-surface-variant'],
                              textDecorationLine: opt.disabled ? 'line-through' : 'none',
                            },
                          ]}
                        >
                          {t(opt.label)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* {t('product.detailsTitle')} Section */}
      <View style={styles.section} collapsable={false}>
        <View style={[styles.detailHeader, { backgroundColor: 'transparent' }]}>
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
            {t('product.detailsTitle')}
          </Text>
        </View>
        <View style={[styles.detailVideo, shadowPresets.md]}>
          <Image source={{ uri: product.image }} style={styles.detailVideoImg} resizeMode="cover" />
        </View>
        <View style={styles.detailTextWrap}>
          <Text style={[styles.detailH2, { color: colors['on-surface'] }]}>
            {localize(product.name)}
          </Text>
          <Text style={[styles.detailBody, { color: colors['on-surface-variant'] }]}>
            {product.description ? localize(product.description) : t('product.noDescription')}
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...typography.h3,
    fontWeight: '600',
  },
  headerInfo: {
    gap: spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tagTertiary: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagTertiaryText: {
    ...typography['label-caps'],
    fontSize: 9,
  },
  tagPrimary: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagPrimaryText: {
    ...typography['label-caps'],
    fontSize: 9,
  },
  h1: {
    ...typography.h1,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  priceBig: {
    ...typography['price-display'],
    fontSize: 28,
    lineHeight: 28 * 1.2,
    flexShrink: 0,
  },
  priceStrike: {
    ...typography['body-sm'],
    textDecorationLine: 'line-through',
  },
  // P3-1 头部评分位（价格行内联，样式对齐 ProductCard metaRow）
  ratingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingInlineText: {
    ...typography['body-sm'],
    fontWeight: '600',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    // Why: 颜色按库存态内联（充足/未知=positive，紧张=warning），不再硬编码 #15803d
  },
  stockText: {
    ...typography['label-caps'],
    fontSize: 12,
  },
  stockSold: {
    ...typography['body-sm'],
  },
  // D5 就近仓状态行（stockRow 下方，绿=就近仓有货 / 橙=仓售罄·无货）
  warehouseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  warehouseText: {
    ...typography['body-sm'],
  },
  // §11.1 紧张提示（步进器上方）
  lowStockTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  lowStockTipIcon: {
    fontSize: 14,
  },
  lowStockTipText: {
    ...typography['body-sm'],
    fontWeight: '700',
  },
  // 数量步进器
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  qtyLabelWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  qtyLabel: {
    ...typography['label-caps'],
    fontSize: 12,
    fontWeight: '700',
  },
  qtyMax: {
    ...typography['body-sm'],
    fontSize: 11,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 18,
    fontWeight: '700',
  },
  stepperVal: {
    minWidth: 32,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },
  // §11.1 断货 banner
  soldOutBanner: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: 4,
  },
  soldOutIcon: {
    fontSize: 28,
  },
  soldOutTitle: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  soldOutDesc: {
    ...typography['body-sm'],
    textAlign: 'center',
  },
  // 规格组容器
  variantGroup: {
    gap: spacing.xs,
  },
  variantGroupName: {
    ...typography['label-caps'],
    fontSize: 11,
  },
  section: {
    gap: spacing.md,
  },
  deliveryCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deliveryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deliveryLabel: {
    ...typography['label-caps'],
    fontSize: 12,
  },
  deliveryAddress: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  deliverySplit: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  deliveryCell: {
    flex: 1,
    gap: 2,
  },
  deliveryValue: {
    ...typography['body-sm'],
  },
  grindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  grindPill: {
    flexGrow: 1,
    flexBasis: '30%',
    paddingVertical: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
  },
  grindText: {
    ...typography['label-caps'],
    fontSize: 12,
  },
  detailHeader: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  detailVideo: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
  },
  detailVideoImg: {
    width: '100%',
    height: '100%',
  },
  detailTextWrap: {
    gap: spacing.md,
  },
  detailH2: {
    ...typography.h2,
    fontWeight: '700',
  },
  detailBody: {
    ...typography['body-md'],
    lineHeight: 24,
  },
});
