// ProductDetailPage — 还原自 ProductDetailPage.html（449 行，最复杂的页面）
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 116%）
// Fix-12: 重建 11 个缺失模块
// 批5 拆分（C-P3-14）：sections/hooks 抽到 product-detail/ 子目录——
//   shared.tsx（常量/纯函数/StarsRow）、sections/{TopBar,Carousel,InfoSection,ReviewsSection,RelatedProductsSection}
//   主文件保留路由壳 + 数据组装 + 底部操作栏，行为零变更（纯搬移）。
import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Share } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, borderRadius } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { useProduct, useProducts, useWarehouseAvailability } from '@/services/queries/useProducts';
import { isMockMode } from '@/services/api';
import { useAddToCart, useCart, CART_ROOT_KEY } from '@/services/queries/useCart';
import { cartApi } from '@/services/cart';
import { useQueryClient } from '@tanstack/react-query';
import { useFavorites, useToggleFavorite } from '@/services/queries/useFavorites';
import { useAddresses } from '@/services/queries/useAddress';
import { useReviews, consumeLastSubmittedReviewId } from '@/services/queries/useReviews';
import { getVariantGroups } from '@/config/variantTemplates';
import { getRelativeTimeUnit, formatPrice } from '@/utils/format';
import { useLocalizer } from '@/i18n';
import { toast } from '@/store/toastStore';
import { PageErrorBoundary } from '@/components/feedback/PageErrorBoundary/PageErrorBoundary';
import { TopBar } from './product-detail/sections/TopBar';
import { Carousel } from './product-detail/sections/Carousel';
import { InfoSection } from './product-detail/sections/InfoSection';
import { ReviewsSection } from './product-detail/sections/ReviewsSection';
import { RelatedProductsSection } from './product-detail/sections/RelatedProductsSection';
import {
  computeStockState,
  deriveWarehouseState,
  PAIRS_WELL_WITH_IDS,
  YOU_MAY_LIKE_IDS,
  type TabKey,
} from './product-detail/shared';

export default function ProductDetailPage() {
  const handleBack = useSafeBack();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const localize = useLocalizer();
  const { data: product, isLoading, isError, refetch } = useProduct(id);
  const { data: allProducts } = useProducts();
  const { data: favorites } = useFavorites();
  const { data: cart } = useCart();
  const { data: addresses } = useAddresses();
  const { data: reviewData, isLoading: reviewsLoading } = useReviews(product?.id);
  const totalItems = cart?.totalItems ?? 0;
  const toggleFavoriteMutation = useToggleFavorite();
  const addToCartMutation = useAddToCart();
  // P2-1（批1 转办）：buyNow 链末尾显式 invalidate 购物车缓存并 await——hook 须在早退分支前调用
  const queryClient = useQueryClient();

  // D5/D11 就近仓可用性：按默认地址坐标查询（hook 须无条件调用，defaultAddr 提前到早退分支前派生）
  const defaultAddr = addresses?.find((a) => a.isDefault) ?? addresses?.[0];
  const { data: warehouseData } = useWarehouseAvailability(
    product?.id,
    defaultAddr?.lat ?? null,
    defaultAddr?.lng ?? null,
  );

  // real 模式下商品 id 是 uuid（mock 的 p003/p006 等匹配不到），改为同类目优先 + 其他补足
  const pairsWellWith = isMockMode
    ? (allProducts ?? []).filter((p) => PAIRS_WELL_WITH_IDS.includes(p.id))
    : [
        ...(allProducts ?? []).filter(
          (p) => p.category === product?.category && p.id !== product?.id,
        ),
        ...(allProducts ?? []).filter(
          (p) => p.category !== product?.category && p.id !== product?.id,
        ),
      ].slice(0, 3);
  const youMayLike = isMockMode
    ? (allProducts ?? []).filter((p) => YOU_MAY_LIKE_IDS.includes(p.id))
    : (allProducts ?? []).filter((p) => p.id !== product?.id).slice(0, 4);
  const isFavorite = Boolean(product && (favorites ?? []).some((p) => p.id === product.id));

  const [activeTab, setActiveTab] = useState<TabKey>('PRODUCT');
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [variantSelection, setVariantSelection] = useState<Record<string, string>>({});
  const [highlightReviewId, setHighlightReviewId] = useState<string | null>(null);

  // §11.2 跨页提交高亮：评价页 submit 后回到本页 focus 时，读一次刚提交的评论 id（读后即清）
  useFocusEffect(
    useCallback(() => {
      const submittedId = consumeLastSubmittedReviewId();
      if (submittedId) setHighlightReviewId(submittedId);
    }, []),
  );

  // P3-2（批D 审查修复）：同实例换品（非 remount 路径）时重置轮播索引，防分页点残留/计数器错位。
  // Why not useEffect: react-hooks/set-state-in-effect 禁止 effect 内同步 setState（级联渲染）；
  // 改用 React 官方「prop 变化时调整 state」模式（渲染期 setState，提交前立即重渲，无级联）。
  const [prevProductId, setPrevProductId] = useState<string | undefined>(product?.id);
  if (prevProductId !== product?.id) {
    setPrevProductId(product?.id);
    setActiveImage(0);
  }

  if (isLoading) {
    return (
      <SafeAreaWrapper edges={['top', 'bottom']} style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
        <TopBar activeTab={activeTab} onTabPress={() => {}} onBack={handleBack} />
        <View style={styles.center}>
          <Text style={{ color: colors['on-surface-variant'] }}>{t('common.loading')}</Text>
        </View>
      </SafeAreaWrapper>
    );
  }
  if (isError || !product) {
    return (
      <SafeAreaWrapper edges={['top', 'bottom']} style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
        <TopBar activeTab={activeTab} onTabPress={() => {}} onBack={handleBack} />
        <ErrorState message={t('product.notFound')} onRetry={() => refetch()} />
      </SafeAreaWrapper>
    );
  }

  // §7 库存 + §8 评论 + §9 Q1 规格 + §9 Q2 地址 — 全部从字段/接口派生，不再写死
  const stockState = computeStockState(product.stock);
  const isSoldOut = stockState === 'out';
  const variants = getVariantGroups(product.category);
  const reviews = reviewData?.reviews ?? [];
  const reviewSummary = reviewData?.summary;

  // D1 轮播图源：images[] 优先（mainImage 首图、去重前置），空数组兜底 mainImage 单图；
  // 两者皆空为 []（轮播容器照常渲染防白屏，分页点/计数器隐藏）
  const mainImageSrc = product.image;
  const carouselImages = [
    ...(mainImageSrc ? [mainImageSrc] : []),
    ...(product.images ?? []).filter((u) => u && u !== mainImageSrc),
  ];

  // P2-2 三态文案/颜色派生（warehouseData 为 null → warehouseText 空 → 整块隐藏）
  const warehouseState = warehouseData ? deriveWarehouseState(warehouseData) : null;
  let warehouseText = '';
  let warehouseColor = colors.semantic.warning;
  if (warehouseData && warehouseState === 'inStock' && warehouseData.warehouseName) {
    warehouseText = t('product.warehouseInStock', { name: warehouseData.warehouseName });
    warehouseColor = colors.semantic.positive;
  } else if (warehouseData && warehouseState === 'soldOut' && warehouseData.warehouseName) {
    warehouseText = t('product.warehouseSoldOut', { name: warehouseData.warehouseName });
  } else if (warehouseData) {
    // 仓名缺失（契约下不可达，防御分支）：通用无货文案，不再显示「有货」反转
    warehouseText = t('product.warehouseNoStock');
  }

  // 步进器上限 = stock（stock 未知时不限）
  const qtyMax = product.stock != null ? product.stock : Number.MAX_SAFE_INTEGER;
  const decQty = () => setQuantity((q) => Math.max(1, q - 1));
  const incQty = () => setQuantity((q) => Math.min(qtyMax, q + 1));

  const selectVariant = (groupName: string, label: string) =>
    setVariantSelection((prev) => ({ ...prev, [groupName]: label }));

  // 评论相对时间：ISO -> i18n 文案（common.relTime.*）
  const formatRelTime = (iso: string): string => {
    const { unit, count } = getRelativeTimeUnit(iso);
    return t(`common.relTime.${unit}`, { count });
  };

  // 加购 toast 回调（addToCart / addRelatedToCart 共用，Q2 提取去重）
  const onCartSuccess = () =>
    toast.success(t('product.addedToCart', { defaultValue: 'Added to cart' }));
  const onCartError = (err: unknown) => {
    const msg =
      err instanceof Error && err.message === 'SOLD_OUT'
        ? t('product.soldOut')
        : err instanceof Error && err.message === 'STOCK_EXCEEDED'
          ? t('product.stockExceeded')
          : t('product.addToCartFailed', { defaultValue: 'Add to cart failed' });
    toast.error(msg);
  };

  // C-P1-2: Buy Now = await 加购 → 显式只选本商品（结算页只结算 selected 项，否则其它
  // 已选中项会被一起带进结算单）→ 再跳结算。链路任一步失败 toast 并中止，不再裸跳。
  // P2-1（批1 转办）：selectOnly 后显式 invalidate 购物车缓存并 await——service 层
  // 拿不到 RQ cache（locale 在 hook 层），不回灌会让结算页 staleTime 60s 内按旧多选集计算。
  const buyNow = async () => {
    if (!product) return;
    try {
      await addToCartMutation.mutateAsync({ product, quantity });
      await cartApi.selectOnly(product.id);
      await queryClient.invalidateQueries({ queryKey: CART_ROOT_KEY });
      router.push('/order/checkout');
    } catch (err) {
      onCartError(err);
    }
  };

  const addRelatedToCart = (p: { id: string }) => {
    const full = (allProducts ?? []).find((item) => item.id === p.id);
    if (!full) return;
    addToCartMutation.mutate(
      { product: full, quantity: 1 },
      { onSuccess: onCartSuccess, onError: onCartError },
    );
  };

  const toggleFavorite = () => {
    if (!product) return;
    toggleFavoriteMutation.mutate(product, {
      onSuccess: ({ isFavorite: fav }) =>
        toast.success(
          fav
            ? t('product.addedToFavorites', { defaultValue: 'Added to favorites' })
            : t('product.removedFromFavorites', { defaultValue: 'Removed from favorites' }),
        ),
    });
  };

  const shareProduct = () => {
    if (!product) return;
    const name = localize(product.name);
    Share.share({
      // Why: 批2 手拼清零（M3）——原 `$${product.price.toFixed(2)}`，金额格式化走单源 formatPrice
      message: `${name} — ${formatPrice(product.price)}\nCheck it out on MeiMart!`,
      title: name,
    }).catch(() => {});
  };

  const writeReview = () => {
    toast.info(
      t('product.reviewAfterPurchase', {
        defaultValue: 'You can write a review after purchasing this product',
      }),
    );
  };

  return (
    <PageErrorBoundary pageName="product-detail">
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        {/* Top Bar with 4-Tab Navigation */}
        <TopBar
          activeTab={activeTab}
          onTabPress={(t) => setActiveTab(t)}
          onBack={handleBack}
          onShare={shareProduct}
          cartCount={totalItems}
        />

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Image Carousel（D-V4：对齐 P1 优化原型 slide 380px 满屏宽 + 分页圆点 + play 按钮） */}
          <Carousel
            images={carouselImages}
            activeImage={activeImage}
            onImageIndexChange={setActiveImage}
          />

          {/* Content Canvas */}
          <View style={styles.canvas}>
            <InfoSection
              product={product}
              stockState={stockState}
              isSoldOut={isSoldOut}
              variants={variants}
              variantSelection={variantSelection}
              selectVariant={selectVariant}
              warehouseData={warehouseData ?? null}
              warehouseText={warehouseText}
              warehouseColor={warehouseColor}
              quantity={quantity}
              qtyMax={qtyMax}
              decQty={decQty}
              incQty={incQty}
              defaultAddr={defaultAddr}
              localize={localize}
            />

            {/* §8 评论模块 - useReviews 驱动：评分卡（count>0）/ 加载骨架 / 空态 */}
            <ReviewsSection
              reviewsLoading={reviewsLoading}
              reviewSummary={reviewSummary}
              reviews={reviews}
              highlightReviewId={highlightReviewId}
              isSoldOut={isSoldOut}
              formatRelTime={formatRelTime}
              writeReview={writeReview}
            />

            {/* {t('product.pairsWellWith')} / {t('product.relatedProducts')} 横滑 */}
            <RelatedProductsSection
              pairsWellWith={pairsWellWith}
              youMayLike={youMayLike}
              localize={localize}
              addRelatedToCart={addRelatedToCart}
            />
          </View>
        </ScrollView>

        {/* Sticky Bottom Actions — U4 三键：收藏(48px) + 立即购买(flex:1描边) + 加购(flex:1) */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors['surface-container-lowest'],
              borderTopColor: colors['outline-variant'],
            },
          ]}
        >
          <Pressable
            onPress={toggleFavorite}
            style={({ pressed }) => [styles.favoriteBtn, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={
              isFavorite ? t('product.removeFromFavorites') : t('product.addToFavorites')
            }
            accessibilityState={{ selected: isFavorite }}
          >
            <Icon
              name={isFavorite ? 'star' : 'star-outline'}
              size={32}
              color={isFavorite ? colors.primary : colors['on-surface']}
            />
            <Text
              style={[
                styles.favoriteText,
                { color: isFavorite ? colors.primary : colors['on-surface'] },
              ]}
            >
              {t('product.favorite')}
            </Text>
          </Pressable>
          <Pressable
            onPress={buyNow}
            disabled={isSoldOut}
            style={({ pressed }) => [
              styles.buyNowBtn,
              {
                borderColor: isSoldOut ? colors['outline-variant'] : colors.primary,
                backgroundColor: isSoldOut ? colors['surface-container-low'] : 'transparent',
              },
              pressed && !isSoldOut && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('product.buyNow')}
            accessibilityState={{ disabled: isSoldOut }}
          >
            <Text
              style={[
                styles.buyNowText,
                { color: isSoldOut ? colors['on-surface-variant'] : colors.primary },
              ]}
            >
              {t('product.buyNow')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() =>
              addToCartMutation.mutate(
                { product, quantity },
                { onSuccess: onCartSuccess, onError: onCartError },
              )
            }
            disabled={isSoldOut}
            style={({ pressed }) => [
              styles.cartBtn,
              {
                backgroundColor: isSoldOut ? colors['surface-container-low'] : colors.primary,
              },
              pressed && !isSoldOut && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('product.addToCart')}
            accessibilityState={{ disabled: isSoldOut }}
          >
            <Text
              style={[
                styles.cartBtnText,
                { color: isSoldOut ? colors['on-surface-variant'] : colors['on-primary'] },
              ]}
            >
              {t('product.addToCart')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaWrapper>
    </PageErrorBoundary>
  );
}

const styles = StyleSheet.create({
  canvas: {
    paddingHorizontal: layout['container-margin'],
    paddingVertical: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 120,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout['container-margin'],
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  favoriteBtn: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  favoriteText: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  buyNowBtn: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyNowText: {
    ...typography['label-caps'],
    fontSize: 14,
    fontWeight: '700',
  },
  cartBtn: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBtnText: {
    ...typography['label-caps'],
    fontSize: 14,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
