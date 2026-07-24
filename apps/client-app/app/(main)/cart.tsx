// CartPage — 还原自 CartPage.html（358 行）
// HTML → RN 行数比：358 → ~440（含样式）
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 123%）
// Fix-19: Primary tais-pattern Header + 商品缩略图 + TaisDivider + You May Also Like + Checkout Bar
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
import {
  useCart,
  useAddToCart,
  useRemoveCartItem,
  useToggleCartItem,
  useUpdateCartItem,
} from '@/services/queries/useCart';
import { useProducts } from '@/services/queries/useProducts';
import { useWeakNetworkUI } from '@/hooks/useWeakNetworkUI';
import { useLocalizer } from '@/i18n';
import type { CartItem } from '@/types';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';
import { PageErrorBoundary } from '@/components/feedback/PageErrorBoundary/PageErrorBoundary';

// Why: "PEOPLE ALSO BOUGHT" 推荐改用真实商品（避免 mock id 'p003' 跳转详情 404）

export default function CartPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { data: realProducts } = useProducts();
  const recommended = (realProducts ?? []).slice(0, 6);
  const addToCartMutation = useAddToCart();
  const localize = useLocalizer();
  const { isOffline } = useWeakNetworkUI();
  const { data: cart, isLoading, isError, refetch } = useCart();
  const removeMutation = useRemoveCartItem();
  const toggleMutation = useToggleCartItem();
  const updateMutation = useUpdateCartItem();

  const isEmpty = !cart || cart.items.length === 0;
  const allSelected = !isEmpty && cart.items.every((i) => i.selected);
  const totalPrice = cart?.totalPrice ?? 0;
  const totalItems = cart?.totalItems ?? 0;
  const discount = 5.0; // mock

  const toggleAll = () => {
    cart?.items.forEach((item) => {
      if (item.selected === allSelected) {
        toggleMutation.mutate({ itemId: item.id, selected: !allSelected });
      }
    });
  };

  const remove = (item: CartItem) => {
    // Why: Web 端 Alert.alert 不显示，直接删除 + toast；Native 端用 Alert 确认
    if (Platform.OS === 'web') {
      removeMutation.mutate(item.id, {
        onSuccess: () => toast.success(t('cart.removed', { defaultValue: 'Removed' })),
      });
      return;
    }
    Alert.alert(
      t('cart.removeTitle'),
      t('cart.removeWithNameConfirm', { name: localize(item.product.name) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('cart.removeAction'),
          style: 'destructive',
          onPress: () => removeMutation.mutate(item.id),
        },
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
            <Icon symbol="search" size={24} color="#ffffff" />
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
          {/* Your Items 标题 + 数量 */}
          <View style={styles.itemsHeader}>
            <Text style={[styles.itemsTitle, { color: colors['on-surface'] }]}>
              {t('cart.yourItems')}
            </Text>
            <Text style={[styles.itemsCount, { color: colors.primary }]}>
              {t('cart.itemCount', { count: totalItems })}
            </Text>
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
                    borderColor: 'rgba(141,112,108,0.3)',
                  },
                ]}
              >
                <CartItemRow
                  item={item}
                  onPress={(i) => toggleMutation.mutate({ itemId: i.id, selected: !i.selected })}
                  onItemPress={(i) => router.push(`/product/${i.product.id}`)}
                  onQuantityChange={(qty) =>
                    updateMutation.mutate({ itemId: item.id, updates: { quantity: qty } })
                  }
                  onDelete={() => remove(item)}
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
                        borderColor: 'rgba(141,112,108,0.1)',
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
                        style={styles.recommendAddBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${localize(rec.name)} to cart`}
                      >
                        <Icon symbol="add_circle" size={24} color={colors.primary} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      )}

      {/* Checkout Bar（HTML 第 256-270 行 — fixed bottom） */}
      {!isEmpty && (
        <View
          style={[
            styles.checkoutBar,
            {
              backgroundColor: colors['surface-container-lowest'],
              borderColor: 'rgba(141,112,108,0.3)',
            },
            shadowPresets.md,
          ]}
        >
          {/* 全选 checkbox */}
          <Pressable
            onPress={toggleAll}
            style={styles.selectAllBtn}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: allSelected }}
            accessibilityLabel={t('cart.selectAllLabel')}
          >
            <Icon
              symbol={allSelected ? 'check_circle' : 'radio_button_unchecked'}
              size={20}
              color={allSelected ? colors.primary : colors['outline-variant']}
            />
            <Text style={[styles.selectAllText, { color: colors['on-surface-variant'] }]}>
              {t('common.all')}
            </Text>
          </Pressable>

          {/* 合计 + 折扣 */}
          <View style={styles.totalBox}>
            <View style={styles.discountRow}>
              <Text style={[styles.discountLabel, { color: colors['on-surface-variant'] }]}>
                {t('order.discount')}
              </Text>
              <View style={[styles.discountPill, { backgroundColor: '#f0fdf4' }]}>
                <Text style={styles.discountText}>-${discount.toFixed(2)}</Text>
              </View>
            </View>
            <View style={styles.totalRow}>
              <Text style={[styles.selectedLabel, { color: colors['on-surface-variant'] }]}>
                {t('cart.selectedTotal')}
              </Text>
              <PriceText value={Math.max(0, totalPrice - discount)} size="lg" />
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
  itemsCount: {
    ...typography['body-sm'],
    fontWeight: '600',
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
    ...typography['label-caps'],
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
    minWidth: 36,
    minHeight: 36,
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
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: spacing.xs,
  },
  selectAllText: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  totalBox: {
    flex: 1,
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  discountLabel: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  discountPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16a34a',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedLabel: {
    fontSize: 12,
  },
  checkoutBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    ...shadowPresets.md,
  },
  checkoutText: {
    color: '#ffffff',
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
