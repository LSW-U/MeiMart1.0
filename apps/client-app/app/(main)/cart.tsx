// CartPage — 还原自 CartPage.html（358 行）
// HTML → RN 行数比：358 → ~440（含样式）
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 123%）
// Fix-19: Primary tais-pattern Header + 商品缩略图 + TaisDivider + You May Also Like + Checkout Bar
import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { toast } from '@/store/toastStore';
import { CartItemRow } from '@/components/business/CartItemRow';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { OfflineBanner } from '@/components/feedback/OfflineBanner';
import { PriceText } from '@/components/ui/PriceText';
import { TaisDivider } from '@/components/cultural/TaisDivider';
import { Icon } from '@/components/ui/Icon';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  useCart,
  useAddToCart,
  useRemoveCartItem,
  useToggleCartItem,
  useUpdateCartItem,
} from '@/services/queries/useCart';
import { useProducts } from '@/services/queries/useProducts';
import { useCoupons } from '@/services/queries/useUser';
import { useWeakNetworkUI } from '@/hooks/useWeakNetworkUI';
import { useLocalizer } from '@/i18n';
import type { CartItem } from '@/types';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';
import { PageErrorBoundary } from '@/components/feedback/PageErrorBoundary/PageErrorBoundary';

// Why: "PEOPLE ALSO BOUGHT" 推荐改用真实商品（避免 mock id 'p003' 跳转详情 404）

// 原因：primary header / CHECKOUT 按钮上的固定白字。两种模式都是品牌红底，白字正确不变。
// 不可用 colors['on-primary']：dark 模式下翻为 #690005（暗红），叠红底会裂色（同 P2 ON_PRIMARY）。
const ON_PRIMARY = '#ffffff';

export default function CartPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { data: realProducts } = useProducts();
  const recommended = (realProducts ?? []).slice(0, 6);
  const addToCartMutation = useAddToCart();
  const localize = useLocalizer();
  const { isOffline } = useWeakNetworkUI();
  const { data: cart, isLoading, isError, refetch } = useCart();
  const { data: coupons } = useCoupons();
  const removeMutation = useRemoveCartItem();
  const toggleMutation = useToggleCartItem();
  const updateMutation = useUpdateCartItem();

  const isEmpty = !cart || cart.items.length === 0;
  const allSelected = !isEmpty && cart.items.every((i) => i.selected);
  const totalPrice = cart?.totalPrice ?? 0;
  const totalItems = cart?.totalItems ?? 0;
  const couponCount = (coupons ?? []).filter((c) => !c.used).length; // §5.1 可用优惠券计数

  // §4 管理模式 state（批量删除替代单个 trash 按钮）
  const [manageMode, setManageMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());

  const toggleAll = () => {
    cart?.items.forEach((item) => {
      if (item.selected === allSelected) {
        toggleMutation.mutate({ itemId: item.id, selected: !allSelected });
      }
    });
  };

  // 管理态全选：checkbox 勾选 = 全部加入 selectedForDelete，取消 = 清空
  const allForDelete =
    !isEmpty && cart.items.length > 0 && cart.items.every((i) => selectedForDelete.has(i.id));
  const toggleAllForDelete = () => {
    setSelectedForDelete(
      allForDelete ? new Set() : new Set((cart?.items ?? []).map((i) => i.id)),
    );
  };

  // §4.2 管理态：checkbox 切删除选中（selectedForDelete），与结算选中 item.selected 解耦
  const toggleDeleteSelect = (item: CartItem) => {
    setSelectedForDelete((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  };
  const enterManage = () => {
    setSelectedForDelete(new Set());
    setManageMode(true);
  };
  const exitManage = () => {
    setSelectedForDelete(new Set());
    setManageMode(false);
  };

  // 管理态单个删除（卡片最右侧 trash）：直删 + toast，同步从 selectedForDelete 移除
  const removeOne = (item: CartItem) => {
    removeMutation.mutate(item.id);
    setSelectedForDelete((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
    toast.success(t('cart.removed', { defaultValue: 'Removed' }));
  };

  // §5.3 批量删除：循环 useRemoveCartItem（mock 量小可接受）；复用 Alert 确认
  const deleteSelected = () => {
    const count = selectedForDelete.size;
    if (count === 0) return;
    const ids = Array.from(selectedForDelete);
    const doDelete = () => {
      ids.forEach((id) => removeMutation.mutate(id));
      setSelectedForDelete(new Set());
      setManageMode(false);
      toast.success(t('cart.removed', { defaultValue: 'Removed' }));
    };
    if (Platform.OS === 'web') {
      doDelete();
      return;
    }
    Alert.alert(
      t('cart.removeTitle'),
      t('cart.deleteConfirm', { count }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('cart.deleteSelected'), style: 'destructive', onPress: doDelete },
      ],
    );
  };

  return (
    <PageErrorBoundary pageName="cart">
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <PrimaryHeader
        title={t('tabs.cart')}
        showLocation
        locationLabel={t('home.locationLabel')}
        onLocationPress={() => router.push('/address/map')}
        rightActions={
          <Pressable
            onPress={() => router.push('/search')}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel={t('common.search')}
          >
            <Icon symbol="search" size={24} color={ON_PRIMARY} />
          </Pressable>
        }
      />

      {isOffline && <OfflineBanner />}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <ErrorState message={t('errors.cart')} onRetry={() => refetch()} />
      ) : isEmpty ? (
        <View style={styles.emptyBox}>
          <EmptyState
            title={t('cart.empty')}
            description={t('cart.emptyDesc')}
            icon="cart-outline"
            actionLabel={t('favorites.goBrowse')}
            onAction={() => router.push('/(main)/home')}
          />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 顶部操作行：默认 Your Items + Coupons + Manage；管理态 Select Items + Cancel（§4.1） */}
          <View style={styles.itemsHeader}>
            {manageMode ? (
              <Text style={[styles.itemsTitle, { color: colors['on-surface'] }]}>
                {t('cart.selectItems')}
              </Text>
            ) : (
              <Text style={[styles.itemsTitle, { color: colors['on-surface'] }]}>
                {t('cart.yourItems')}
              </Text>
            )}
            {manageMode ? (
              <Pressable
                onPress={exitManage}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('cart.cancelManage')}
              >
                <Text style={[styles.manageBtn, { color: colors.primary }]}>
                  {t('cart.cancelManage')}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.itemsHeaderRight}>
                <Pressable
                  onPress={() => router.push('/coupons')}
                  style={styles.couponsEntry}
                  accessibilityRole="button"
                  accessibilityLabel={t('cart.couponsAvailable', { count: couponCount })}
                >
                  <Icon symbol="confirmation_number" size={16} color={colors.primary} />
                  <Text style={[styles.couponsEntryText, { color: colors.primary }]}>
                    {t('cart.couponsAvailable', { count: couponCount })}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={enterManage}
                  hitSlop={8}
                  style={[styles.manageBtnWrap, { borderColor: colors.primary }]}
                  accessibilityRole="button"
                  accessibilityLabel={t('cart.manage')}
                >
                  <Text style={[styles.manageBtn, { color: colors.primary }]}>
                    {t('cart.manage')}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* 购物车商品列表 */}
          <View style={styles.cartList}>
            {cart.items.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.cartItemWrap,
                  {
                    backgroundColor: colors['surface-container-lowest'],
                    borderColor: colors['outline-variant'],
                  },
                ]}
              >
                <CartItemRow
                  item={item}
                  // §4.2 管理态：checkbox 切删除选中 + 反映 selectedForDelete；步进器隐藏（onQuantityChange=undefined）
                  onPress={
                    manageMode
                      ? (i) => toggleDeleteSelect(i)
                      : (i) => toggleMutation.mutate({ itemId: i.id, selected: !i.selected })
                  }
                  checkedOverride={manageMode ? selectedForDelete.has(item.id) : undefined}
                  onItemPress={manageMode ? undefined : (i) => router.push(`/product/${i.product.id}`)}
                  onQuantityChange={
                    manageMode
                      ? undefined
                      : (qty) =>
                          updateMutation.mutate({ itemId: item.id, updates: { quantity: qty } })
                  }
                  onDelete={manageMode ? removeOne : undefined}
                  showControls
                />
              </View>
            ))}
          </View>

          {/* Tais Divider（HTML 第 224-227 行） */}
          <View style={styles.dividerWrap}>
            <TaisDivider width={120} />
          </View>

          {/* PEOPLE ALSO BOUGHT 推荐区 */}
          <View style={styles.recommendWrap}>
            <Text style={[styles.recommendTitle, { color: colors['on-surface-variant'] }]}>
              {t('cart.peopleAlsoBought')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.recommendRow}>
                {recommended.map((rec) => (
                  <View
                    key={rec.id}
                    style={[
                      styles.recommendCard,
                      {
                        backgroundColor: colors['surface-container-lowest'],
                        borderColor: colors['outline-variant'],
                      },
                    ]}
                  >
                    {/* Why: 图片+名称可点击跳转详情；+ 按钮独立加购，避免 Pressable 嵌套 */}
                    <Pressable
                      onPress={() => router.push(`/product/${rec.id}`)}
                      style={styles.recommendClickable}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${localize(rec.name)}`}
                    >
                      <View
                        style={[
                          styles.recommendImageWrap,
                          { backgroundColor: colors['surface-container'] },
                        ]}
                      >
                        <SafeImage source={{ uri: rec.image }} style={styles.recommendImage} />
                      </View>
                      <Text
                        style={[styles.recommendName, { color: colors['on-surface-variant'] }]}
                        numberOfLines={1}
                      >
                        {localize(rec.name)}
                      </Text>
                      <Text style={[styles.recommendPrice, { color: colors.primary }]}>
                        ${rec.price.toFixed(2)}
                      </Text>
                    </Pressable>
                    <View style={styles.recommendBottom}>
                      <Pressable
                        onPress={() =>
                          addToCartMutation.mutate(
                            { product: rec, quantity: 1 },
                            {
                              onSuccess: () =>
                                toast.success(
                                  t('product.addedToCart', { defaultValue: 'Added to cart' }),
                                ),
                              onError: () =>
                                toast.error(
                                  t('product.addToCartFailed', { defaultValue: 'Add to cart failed' }),
                                ),
                            },
                          )
                        }
                        hitSlop={8}
                        style={({ pressed }) => [
                          styles.recommendAddBtn,
                          { backgroundColor: colors.primary },
                          pressed && { opacity: 0.85 },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${localize(rec.name)} to cart`}
                      >
                        <Icon symbol="add" size={18} color={ON_PRIMARY} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      )}

      {/* 底部栏：管理态显删除栏（§4.3），默认显结算栏（§3.4 锁定，仅去 discount 行） */}
      {!isEmpty && manageMode && (
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
            disabled={selectedForDelete.size === 0}
            style={({ pressed }) => [
              styles.deleteBtnBar,
              { backgroundColor: colors.error },
              pressed && selectedForDelete.size > 0 && { transform: [{ scale: 0.98 }] },
              selectedForDelete.size === 0 && { opacity: 0.5 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('cart.deleteSelected')}
          >
            <Text style={styles.deleteBtnBarText}>
              {t('cart.deleteSelected').toUpperCase()} ({selectedForDelete.size})
            </Text>
          </Pressable>
        </View>
      )}
      {!isEmpty && !manageMode && (
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

          {/* 合计（§5.2 去写死 discount，无优惠券接口隐藏折扣行，总价 = totalPrice） */}
          <View style={styles.totalBox}>
            <View style={styles.totalRow}>
              <Text style={[styles.selectedLabel, { color: colors['on-surface-variant'] }]}>
                {t('cart.selectedTotal')}
              </Text>
              <PriceText value={Math.max(0, totalPrice)} size="lg" />
            </View>
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
      )}
    </SafeAreaWrapper>
    </PageErrorBoundary>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: layout['container-margin'],
    paddingBottom: 160,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  itemsTitle: {
    ...typography.h3,
    fontWeight: '700',
  },
  couponsEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  couponsEntryText: {
    ...typography['body-sm'],
    fontWeight: '600',
  },
  // §3.2 顶部右侧 Coupons + Manage 组合
  itemsHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  manageBtnWrap: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: 4,
  },
  manageBtn: {
    ...typography['label-caps'],
    fontSize: 12,
    fontWeight: '700',
  },
  cartList: {
    gap: spacing.md,
  },
  cartItemWrap: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  dividerWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    opacity: 0.3,
  },
  recommendWrap: {
    marginBottom: spacing.md,
  },
  recommendTitle: {
    ...typography['body-md'],
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  recommendRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  recommendCard: {
    width: 140,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.sm,
    ...shadowPresets.sm,
  },
  recommendClickable: {
    gap: spacing.xs,
  },
  recommendImageWrap: {
    height: 96,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  recommendImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  recommendName: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  recommendBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  recommendAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendPrice: {
    ...typography['price-display'],
    fontSize: 14,
  },
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
  selectAllText: {
    ...typography['label-caps'],
    fontSize: 10,
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    ...shadowPresets.md,
  },
  checkoutText: {
    color: ON_PRIMARY,
    ...typography['label-caps'],
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
  },
});
