// ProductDetailPage — 还原自 ProductDetailPage.html（449 行，最复杂的页面）
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 116%）
// Fix-12: 重建 11 个缺失模块
// 批5 拆分（C-P3-14）：sections/hooks 抽到 product-detail/ 子目录——
//   shared.tsx（常量/纯函数/StarsRow）、sections/{TopBar,Carousel,InfoSection,ReviewsSection,RelatedProductsSection}
//   主文件保留路由壳 + 数据组装 + 底部操作栏，行为零变更（纯搬移）。
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Share,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeBack } from '@/hooks/useSafeBack';
import { reportProductView } from '@/hooks/useBrowseHistory';
import { useTranslation } from 'react-i18next';
import { shadowPresets, useTheme, spacing, layout, typography, borderRadius } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageSkeleton } from '@/components/feedback/PageSkeleton/PageSkeleton';
import { Icon } from '@/components/ui/Icon';
import { useProduct, useProducts, useWarehouseAvailability } from '@/services/queries/useProducts';
import {
  useAlertSubscriptions,
  useToggleAlertSubscription,
} from '@/services/queries/useSubscriptions';
import { isMockMode } from '@/services/api';
import { useAddToCart, useCart, CART_ROOT_KEY } from '@/services/queries/useCart';
import { cartApi } from '@/services/cart';
import { useQueryClient } from '@tanstack/react-query';
import { useFavorites, useToggleFavorite } from '@/services/queries/useFavorites';
import { useAuthStore } from '@/store/authStore';
import { useAddresses } from '@/services/queries/useAddress';
import { useReviews, consumeLastSubmittedReviewId } from '@/services/queries/useReviews';
import { getRelativeTimeUnit, formatPrice } from '@/utils/format';
import { useLocalizer } from '@/i18n';
import { toast } from '@/store/toastStore';
import { trackProductView } from '@/services/behavior';
import type { AlertSubscriptionType } from '@/services/subscriptions';
import { getApiErrorMessage } from '@/utils/error';
import { PageErrorBoundary } from '@/components/feedback/PageErrorBoundary/PageErrorBoundary';
import { TopBar } from './product-detail/sections/TopBar';
import { Carousel } from './product-detail/sections/Carousel';
import { InfoSection, DetailsSection } from './product-detail/sections/InfoSection';
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

  // 批5 C7/C8 提醒订阅（hook 须在早退分支前调用——rules-of-hooks）：C8 到货=缺货 / C7 降价=有货，
  // 互斥单按钮；匿名点击引导登录（端点 Roles CUSTOMER）。product 未就绪时 alertType 恒 PRICE_ALERT，
  // 就绪后随库存态切换 queryKey 自动重查（列表是「我的订阅」全量，与 id 无关，无害）
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const alertType: AlertSubscriptionType =
    product && computeStockState(product.stock) === 'out' ? 'RESTOCK_ALERT' : 'PRICE_ALERT';
  const { data: alertSubs } = useAlertSubscriptions(alertType);
  const toggleAlertMutation = useToggleAlertSubscription(alertType);
  const alertSubsList = useMemo(() => alertSubs ?? [], [alertSubs]);
  const productId = product?.id;
  const handleAlertToggle = useCallback(() => {
    if (!productId) return;
    if (!isAuthenticated) {
      toast.info(t('product.alertLoginRequired'));
      router.push('/(auth)/login');
      return;
    }
    const isSoldOut = alertType === 'RESTOCK_ALERT';
    const mySub = alertSubsList.find((s) => s.productId === productId && s.enabled) ?? null;
    toggleAlertMutation.mutate(
      { productId, subscriptionId: mySub?.id ?? null },
      {
        onSuccess: () => {
          toast.success(
            mySub
              ? t('product.alertOff')
              : t(isSoldOut ? 'product.restockAlertSubscribed' : 'product.priceAlertSubscribed'),
          );
        },
        onError: (err) => {
          toast.error(getApiErrorMessage(err, t('product.alertFailed')));
        },
      },
    );
  }, [isAuthenticated, t, toggleAlertMutation, productId, alertSubsList, alertType]);

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
  const [highlightReviewId, setHighlightReviewId] = useState<string | null>(null);

  // ===== 20261114 规格选择器接真实 SKU（拍板 Q1-A + Q2-A）=====
  // 状态从 variantSelection（模板 label 索引）换为 selectedSkuId。无 effect 初始化——
  // selectedSkuId 只存「用户显式选择」（null = 未选），渲染期派生有效选中：
  // 未选/失效（品切换后旧 id 不在新 SKU 集）→ 回落默认 = 第一个有货 SKU（全缺货兜底第一个）。
  // 用户显式选择永远优先（点过缺货外的任意 SKU 后，切品回来不覆盖）。
  const [userSkuId, setUserSkuId] = useState<string | null>(null);
  const selectSku = useCallback((id: string) => setUserSkuId(id), []);

  // 20261111 Tab 锚点滚动修复（用户反馈「顶部导航点击没反应」）：activeTab 原本只被
  //   TopBar 下划线高亮消费，内容区无条件全渲染——点击无任何内容反馈。HTML 原型
  //   ProductDetailPage.html switchTab 就是锚点滚动（section.offsetTop - 64，smooth），
  //   本实现对齐原型：三区块（详情/评价/推荐）onLayout 记 y，点 tab scrollTo 平滑滚过去
  //   （PRODUCT=回到顶部 0）。DETAILS/RECOMMENDED 同指 InfoSection 尾/Related 区：
  //   canvas 是 gap 布局，InfoSection 锚 y 与 Related 区锚 y 天然不同，各自独立量测。
  const scrollRef = useRef<ScrollView | null>(null);
  const sectionYs = useRef<Partial<Record<TabKey, number>>>({});
  const canvasYRef = useRef(0);
  const recordSectionY = useCallback(
    (tab: TabKey) => (e: { nativeEvent: { layout: { y: number } } }) => {
      // 锚点 View 的 y 相对 canvas（局部坐标），滚动时叠加 canvasY 换算成
      // ScrollView 内容坐标（handleTabPress 注释详述层级）
      sectionYs.current[tab] = e.nativeEvent.layout.y + canvasYRef.current;
    },
    [],
  );
  const handleTabPress = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    // PRODUCT = 回到列表顶部（原型 switchTab 'product' 锚 #product 即轮播顶）。
    // 20261111 修复：PRODUCT 无锚点段（sectionYs 恒 undefined）原实现安全跳过——
    //   「点商品 tab 不回顶」，改显式滚到 0。
    if (tab === 'PRODUCT') {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    // 其余 tab：scrollY = canvasY + sectionY（canvas 内锚点局部 y + canvas 自身在
    //   滚动内容里的 y，canvasYRef 由 canvas 外圈锚 View 的 onLayout 记录）。
    const y = sectionYs.current[tab];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(y - 8, 0), animated: true });
  }, []);

  // 20261111 右下角悬浮回顶按钮（用户拍板，对齐首页 home.tsx 20261108 方案A 同款）：
  //   滚过一屏（600px）出现、回顶后消失；布尔翻转才 setState（ScrollView 连续滚动
  //   事件避免每帧重渲）。a11y 文案复用 home.backToTop（四语齐全，语义通用）。
  const [showBackTop, setShowBackTop] = useState(false);
  const BACK_TOP_THRESHOLD = 600;
  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = e.nativeEvent.contentOffset.y > BACK_TOP_THRESHOLD;
    setShowBackTop((prev) => (prev === next ? prev : next));
  }, []);
  const handleBackToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setActiveTab('PRODUCT');
  }, []);

  // §11.2 跨页提交高亮：评价页 submit 后回到本页 focus 时，读一次刚提交的评论 id（读后即清）
  useFocusEffect(
    useCallback(() => {
      const submittedId = consumeLastSubmittedReviewId();
      if (submittedId) setHighlightReviewId(submittedId);
      // 批5 G2 埋点：进详情页即报 VIEW（fire-and-forget，攒批 30s/20 条 flush，失败静默）
      if (id) trackProductView(id);
      // 20261109 融合页 B1：本地浏览历史上报（useBrowseHistory AsyncStorage，去重置顶上限 50）
      if (id) reportProductView(id);
    }, [id]),
  );

  // 业务增强批3（3.5 最小范围）：内容区进场动画——商品详情主体（Carousel + 内容 Canvas）
  // 挂载后淡入 + 轻微上移（240ms ease-out）；loading/error 早退分支不动画（骨架屏照旧）。
  // Why not 布局动画/共享元素：共享元素转场需 react-native-screens 转场协议改造导航栈，
  // 超出本批最小范围（任务书 R3 限定 reanimated 已依赖、仅动本文件），按渐入渐现实现。
  const contentOpacity = useSharedValue(0);
  const contentTranslate = useSharedValue(8);
  useEffect(() => {
    // 动画值推进只发生在 effect/回调内（非渲染期），符合 react-hooks purity 规则
    contentOpacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.ease) });
    contentTranslate.value = withTiming(0, { duration: 240, easing: Easing.out(Easing.ease) });
  }, [contentOpacity, contentTranslate]);
  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslate.value }],
  }));

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
        {/* 批2 阶段2（D8 审计）：loading 纯文字位换 PageSkeleton(detail)，只换组件不动结构 */}
        <PageSkeleton variant="detail" />
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
  const reviews = reviewData?.reviews ?? [];
  const reviewSummary = reviewData?.summary;

  const alertEntry = {
    kind: isSoldOut ? ('restock' as const) : ('price' as const),
    subscribed: alertSubsList.find((s) => s.productId === product.id && s.enabled) != null,
    // mutation 进行中禁用防连点；匿名不禁用（点击走引导登录分支）
    disabled: toggleAlertMutation.isPending,
    onPress: handleAlertToggle,
  };

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

  // ===== 规格选择器派生（hook 声明见 early-return 之前）=====
  // 选择器只在 product.skus 非空时渲染（mock 无多 SKU 数据也天然兼容）。
  // 有效选中 = 用户显式选择（仍在 SKU 集内）否则默认 = 第一个有货 SKU（全缺货兜底第一个）。
  // 步进器上限 = 选中 SKU 的 stock（未选/无 skus 用聚合 stock）；quantity 超限渲染期钳制
  //（incQty/decQty 的 Math.min 兜住交互路径，不用 effect setState 级联）。
  const skus = product.skus ?? [];
  const selectedSkuId = userSkuId && skus.some((s) => s.id === userSkuId) ? userSkuId : null;
  const selectedSku =
    (selectedSkuId && skus.find((s) => s.id === selectedSkuId)) ||
    skus.find((s) => (s.stock ?? 1) > 0) ||
    skus[0] ||
    null;
  const rawQtyMax =
    selectedSku?.stock ?? (product.stock != null ? product.stock : Number.MAX_SAFE_INTEGER);
  // 步进上限 = max(1, stock)（断货 SKU 兜底 1 可减不可加）；incQty 内 Math.min 再钳交互
  const qtyMax = Math.max(1, rawQtyMax);
  const decQty = () => setQuantity((q) => Math.max(1, q - 1));
  const incQty = () => setQuantity((q) => Math.min(qtyMax, q + 1));

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
      await addToCartMutation.mutateAsync({ product, quantity, skuId: selectedSkuId ?? undefined });
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
          onTabPress={handleTabPress}
          onBack={handleBack}
          onShare={shareProduct}
          cartCount={totalItems}
        />

        {/* 20261111 Tab 锚点滚动：ScrollView 挂 ref，onLayout 锚点段记 y（相对 ScrollView 内容坐标）；
          onScroll 驱动右下角回顶按钮显隐（滚过一屏出现） */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* 3.5 进场动画容器：Carousel + 内容 Canvas（loading/error 早退分支不包，骨架屏无动画） */}
          <Animated.View style={[{ flex: 1 }, contentAnimStyle]}>
            {/* Image Carousel（D-V4：对齐 P1 优化原型 slide 380px 满屏宽 + 分页圆点 + play 按钮） */}
            <Carousel
              images={carouselImages}
              activeImage={activeImage}
              onImageIndexChange={setActiveImage}
            />

            {/* Content Canvas — 外圈锚 View 量 canvas 自身 y（供锚点局部坐标换算） */}
            <View onLayout={(e) => (canvasYRef.current = e.nativeEvent.layout.y)}>
              <View style={styles.canvas}>
                <InfoSection
                  product={product}
                  stockState={stockState}
                  isSoldOut={isSoldOut}
                  alertEntry={alertEntry}
                  skus={skus}
                  selectedSkuId={selectedSku?.id ?? null}
                  selectSku={selectSku}
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

                {/* 20261111 用户拍板段序：Details 图文卡紧跟商品信息区（原页尾位置与
                  PRODUCT 落点重叠的历史见 DetailsSection 注释）；锚点同步跟随 */}
                <View onLayout={recordSectionY('DETAILS')} testID="tab-anchor-details">
                  <DetailsSection product={product} localize={localize} />
                </View>

                {/* §8 评论模块 - useReviews 驱动：评分卡（count>0）/ 加载骨架 / 空态 */}
                <View onLayout={recordSectionY('REVIEWS')} testID="tab-anchor-reviews">
                  <ReviewsSection
                    reviewsLoading={reviewsLoading}
                    reviewSummary={reviewSummary}
                    reviews={reviews}
                    highlightReviewId={highlightReviewId}
                    isSoldOut={isSoldOut}
                    formatRelTime={formatRelTime}
                    writeReview={writeReview}
                  />
                </View>

                {/* {t('product.pairsWellWith')} / {t('product.relatedProducts')} 横滑 */}
                <View onLayout={recordSectionY('RECOMMENDED')} testID="tab-anchor-recommended">
                  <RelatedProductsSection
                    pairsWellWith={pairsWellWith}
                    youMayLike={youMayLike}
                    localize={localize}
                    addRelatedToCart={addRelatedToCart}
                  />
                </View>
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        {/* 20261111 拍板：右下角悬浮回顶按钮（对齐首页 home.tsx 同款规格：44×44 圆形 +
          surface-container-lowest + expand_less + shadow md；滚过一屏出现）。
          浮在底部固定三键栏上方：栏高 ≈ paddingVertical 16×2 + 按钮内容 ≈ 80，
          bottom 取 88 避让（无 BottomNav 的页面，无 safe inset 叠加需求——
          SafeAreaWrapper edges bottom 已把内容区垫高） */}
        {showBackTop && (
          <Pressable
            testID="product-back-to-top"
            onPress={handleBackToTop}
            style={({ pressed }) => [
              styles.backToTopBtn,
              { backgroundColor: colors['surface-container-lowest'] },
              shadowPresets.md,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('home.backToTop')}
          >
            <Icon symbol="expand_less" size={24} color={colors.primary} />
          </Pressable>
        )}

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
                { product, quantity, skuId: selectedSkuId ?? undefined },
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
  // Why: 20261111 拍板——右下角悬浮回顶按钮（44×44 圆形，浮在底部三键栏上方，对齐首页同款）
  backToTopBtn: {
    position: 'absolute',
    right: layout['container-margin'],
    // 20261111 用户拍板 A+B：栏高随按钮调矮 97→81，bottom 88→96（81+15 间距），
    //   原值被加购按钮下缘遮挡。⚠️ 栏高若再调需同步本算式（另一消费方 home.tsx 同款按钮规格暂不分叉）
    bottom: 96,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyNowBtn: {
    flex: 1,
    // 20261111 用户拍板 B：paddingVertical lg(24) → md(16)，按钮 64→48px，
    //   底部三键栏收薄（97→81px），商品区可见面积 +16px；仍 ≥44px a11y 热区
    paddingVertical: spacing.md,
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
    // 20261111 用户拍板 B：同 buyNowBtn，lg(24) → md(16) 对齐
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBtnText: {
    ...typography['label-caps'],
    fontSize: 14,
    fontWeight: '700',
  },
});
