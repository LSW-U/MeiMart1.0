// 本页通过 BannerCarousel / CategoryGrid / PromoDock / MasonryProductCard / SmallProductCard 复用
// 还原自 HomePage.html（511 行）。HTML → RN 行数比：511 → ~480（含样式），
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 94%）。
// P6: 间距微调 + 分类网格 C2/角标/溢出 + PromoShortcut→PromoDock（方案二色条）
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useTheme,
  spacing,
  layout,
  typography,
  shadowPresets,
  gradientPresets,
  borderRadius,
} from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { BannerCarousel } from '@/components/business/BannerCarousel';
import { CategoryGrid } from '@/components/business/CategoryGrid';
import { PromoDock } from '@/components/business/PromoDock';
import { SmallProductCard } from '@/components/business/SmallProductCard/SmallProductCard';
import { MasonryProductCard } from '@/components/business/MasonryProductCard/MasonryProductCard';
import { resolveBadges } from '@/utils/resolveBadges';
import { dedupeById } from '@/utils/dedupeById';
import { splitMasonryBalanced } from '@/utils/splitMasonryBalanced';
import type { Banner, Product } from '@/types';
import type { Promotion } from '@/services/promotion';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TaisDivider } from '@/components/cultural/TaisDivider';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Logo } from '@/components/cultural/Logo';
import { UmaLulikSkyline } from '@/components/cultural/UmaLulikSkyline';
import { Icon } from '@/components/ui/Icon';
import { useCategories, useBanners } from '@/services/queries/useCatalog';
import {
  useRecommendationsInfinite,
  useBuyAgain,
  useFrequentBundle,
} from '@/services/queries/useProducts';
import { usePromotions } from '@/services/queries/usePromotions';
import { useAddToCart } from '@/services/queries/useCart';
import { useUnreadCount } from '@/services/queries/useNotifications';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import { useWeakNetworkUI } from '@/hooks/useWeakNetworkUI';
import { PageErrorBoundary } from '@/components/feedback/PageErrorBoundary/PageErrorBoundary';
import { safeRoutePush } from '@meimart/nav-core';

// Why: 红底白字固定（header primary 渐变底 + 红色 badge 底），dark 不变
//   同 MasonryProductCard/SmallProductCard/HorizontalProductCard 的 ON_PRIMARY 模式
//   不用 colors['on-primary']（dark 翻 #690005 裂色）—— 审查 Q1
const ON_PRIMARY = '#ffffff';
// Why: 黄底黑字固定（delivery tip amber 底），dark 不变 —— 审查 Q1
const ON_AMBER = '#000000';

// Buy Again 区块改用 useBuyAgain 从 mockDb 拉 p007-p010，避免与详情页数据脱节
// Why: 换一批按钮 批2 —— 两板块每批数量常量（recommend 后端默认 6 / buy-again 原固定 4）
const RECOMMEND_LIMIT = 6;
const BUY_AGAIN_LIMIT = 4;

export default function HomePage() {
  const { colors } = useTheme();
  // Why: 底部留白动态算 —— 浮动 BottomNav(56) + 底部手势条 inset + 余量 8。
  //   原固定 96px 在无手势条环境（模拟器）多出 ~40px 露出成页尾空白（用户验收 20261023）。
  const insets = useSafeAreaInsets();
  const bottomReserve = 56 + insets.bottom + 8;
  const { t } = useTranslation();
  const { shouldSkipNonEssential } = useWeakNetworkUI();
  const { data: banners } = useBanners();
  const { data: categories } = useCategories();
  // Why: 首页推荐展示 批2（方案v2 20261017）——推荐板块切追加式真分页（useInfiniteQuery）：
  //   pages.flatMap 拼全部已加载页，奇偶分列追加后自动重排；换一批改 epoch 复位（D3 方案 B，
  //   epoch 进 queryKey 精确匹配，旧 epoch 缓存 5min 后 GC，零 resetQueries 前缀副作用）。
  //   旧 useRecommendations 保留（cart.tsx 消费中，cart 不改）。
  // Why: 20261023 real 模式修订（原 D3 方案 B epoch++ 失效）：后端推荐是确定性排序
  //   （salesCount desc / 类目加权），epoch++ 重查 offset=0 每次返回同一批 → placeholderData
  //   保旧列表 + 新数据相同 → 换一批感知「没反应」。改为 baseOffset 推进 += limit，换到的
  //   真是后面一批；短批（不足 limit，说明到底）回绕 0。mock 模式下 getRecommendations 透传
  //   offset 后行为一致（mockCursor 同款回绕语义）。
  const [recommendBaseOffset, setRecommendBaseOffset] = useState(0);
  const [recommendCycle, setRecommendCycle] = useState(0);
  const [buyAgainOffset, setBuyAgainOffset] = useState(0);
  const {
    data: recommendPages,
    isLoading,
    isError,
    refetch,
    isFetching: isFetchingRecommend,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useRecommendationsInfinite({
    limit: RECOMMEND_LIMIT,
    baseOffset: recommendBaseOffset,
    cycle: recommendCycle,
  });
  const recommendList = useMemo(
    () => dedupeById(recommendPages?.pages.flatMap((p) => p) ?? []),
    [recommendPages],
  );
  // Why: 20261023 方案A——奇偶分列改累计高度均衡分列（splitMasonryBalanced），
  //   两列底部差收敛到一张卡内（原 i%2 加载到底左长右短，用户实测）
  const masonryCols = useMemo(() => splitMasonryBalanced(recommendList), [recommendList]);
  // Why: §9-4 瀑布流两列分发改 FlatList numColumns（C-P2-10，分发逻辑由列表承担）
  const { data: buyAgainProducts, isFetching: buyAgainFetching } = useBuyAgain({
    limit: BUY_AGAIN_LIMIT,
    offset: buyAgainOffset,
  });
  // Why: 换一批循环推进（20261023 第二轮修订）——「prev + 已加载页数」方案在用户先把
  //   加载更多点到底时失效：baseOffset 仍为 0、短页只在末尾，回绕算出 0 → 同 queryKey
  //   不重查 → 真·没反应（人工验收实证）。改为「固定步长 + 探测池终点」：
  //   - 每次换一批 baseOffset += limit（换到的真是下一批，12 批循环 ≈ 池 70 条）
  //   - 某批返回短页（< limit）说明池到头，记 poolEnd = 该批起点 + 实际条数，
  //     下一次 next ≥ poolEnd 回绕 0——即使 poolEnd 是加载更多探出来的也成立
  const recommendPoolEnd = useMemo(() => {
    const pages = recommendPages?.pages ?? [];
    if (pages.length === 0) return null;
    const last = pages[pages.length - 1];
    if (last.length >= RECOMMEND_LIMIT) return null;
    return recommendBaseOffset + (pages.length - 1) * RECOMMEND_LIMIT + last.length;
  }, [recommendPages, recommendBaseOffset]);
  const handleRecommendChangeBatch = useCallback(() => {
    if (!isFetchingRecommend && !isFetchingNextPage) {
      // Why: 方案A（20261024 拍板）——每次换一批都 cycle++ 无条件换全新 queryKey。
      //   原来只在回绕 0 时 cycle++，非回绕推进沿用同 key：5min staleTime 内命中旧缓存，
      //   若旧 key 之前被「加载更多」拉过全链，整列表（含到底态 70 条）原样复用 →
      //   「点击换一批收不回去」（placeholderData 泄漏口已在 hook 层 186de81 修，此处堵
      //   缓存复用口）。cycle++ 后每个 key 至多消费一次，不复用旧整链。
      setRecommendCycle((c) => c + 1);
      setRecommendBaseOffset((prev) => {
        const next = prev + RECOMMEND_LIMIT;
        if (recommendPoolEnd != null && next >= recommendPoolEnd) {
          return 0;
        }
        return next;
      });
    }
  }, [isFetchingRecommend, isFetchingNextPage, recommendPoolEnd]);
  // Why: 20261024 方案②——「收起推荐」文字链（加载更多到底后出现）：回 baseOffset=0 +
  //   cycle++ 全新 queryKey，干净 6 条回到初态（无加载更多、无收起按钮）
  const handleRecommendCollapse = useCallback(() => {
    if (!isFetchingRecommend && !isFetchingNextPage) {
      setRecommendCycle((c) => c + 1);
      setRecommendBaseOffset(0);
    }
  }, [isFetchingRecommend, isFetchingNextPage]);
  // Why: 首页推荐展示 批2 ——「加载更多」三态：可点 fetchNextPage / isFetchingNextPage
  //   loading（防连点，同换一批按钮范式）/ !hasNextPage 条件渲染移除（D4 按钮消失）
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const buyAgainCount = buyAgainProducts?.length ?? 0;
  const handleBuyAgainChangeBatch = useCallback(() => {
    setBuyAgainOffset((prev) => {
      const next = prev + BUY_AGAIN_LIMIT;
      return buyAgainCount < BUY_AGAIN_LIMIT ? 0 : next;
    });
  }, [buyAgainCount]);
  // A-P2-2：useMemo 稳定引用（renderDashboardHeader 依赖数组要求引用稳定，空数组兜底不变）
  const buyAgainList = useMemo(() => buyAgainProducts ?? [], [buyAgainProducts]);
  // 批3 P2-1 修复：B1 常购清单入口——「查看全部」仅登录态展示（匿名看的是销量兜底切片
  //   而非「你常买的」，入口跟着语义走；B1 页自身匿名分流见 frequently-bought.tsx）
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // Why: 客户画像批3 B8 常买组合（2026-10-18）——useFrequentBundle 拉打包组合（seed+伙伴），
  //   空组合（匿名/无历史/无共现/门禁关）整块隐藏；一键整包加购走 addToCartMutation 逐个 mutate
  const { data: bundle } = useFrequentBundle();
  const { data: promotions } = usePromotions();
  const addToCartMutation = useAddToCart();
  const bundleItems = useMemo(() => (bundle?.seed ? [bundle.seed, ...bundle.items] : []), [bundle]);
  const [bundlePending, setBundlePending] = useState(false);
  // Why: 整包加购 = seed + items 逐个 addToCart（后端无 batch 端点）；串行 mutation 防竞态，
  //   全部成功才 toast，任一失败弹错误并停（部分已入车由 invalidate 校准，不回滚）
  const handleBundleAddAll = useCallback(() => {
    if (bundlePending || bundleItems.length === 0) return;
    setBundlePending(true);
    void (async () => {
      // 批3 P3-3 修复：错误 toast 带已成功计数（部分成功语义可见，不回滚由 invalidate 校准）
      let done = 0;
      try {
        for (const item of bundleItems) {
          await addToCartMutation.mutateAsync({ product: item, quantity: 1 });
          done += 1;
        }
        toast.success(t('home.bundleAdded', { count: bundleItems.length }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        toast.error(
          msg === 'SOLD_OUT'
            ? t('product.soldOut', { defaultValue: 'Sold Out' })
            : msg === 'STOCK_EXCEEDED'
              ? t('product.stockExceeded')
              : t('product.addToCartFailed', { defaultValue: 'Failed to add to cart' }),
        );
        if (done > 0) {
          // 部分成功补充说明（一行文案注明失败语义，审查 P3-3 顺手项）
          toast.info(t('home.bundlePartialAdded', { done, failed: bundleItems.length - done }));
        }
      } finally {
        setBundlePending(false);
      }
    })();
  }, [bundlePending, bundleItems, addToCartMutation, t]);
  // 批B B3：mail 图标角标换真实未读数（原硬编码 2 是线上假数据，方案v2 风险#8）
  // 未登录时 useUnreadCount 不请求（enabled: isAuthenticated）→ data undefined → 不显示角标
  const { data: unreadCount } = useUnreadCount();

  // Why: Buy again 加购
  // C-P2-10: useCallback 稳定化——memo 化的 MasonryProductCard/SmallProductCard props 浅比较，
  //   回调不稳定会让 memo 失效（每渲染全列表重渲）
  const handleBuyAgainAddToCart = useCallback(
    (item: Product) => {
      addToCartMutation.mutate(
        { product: item, quantity: 1 },
        {
          onSuccess: () =>
            toast.success(t('product.addedToCart', { defaultValue: 'Added to cart' })),
          onError: () =>
            toast.error(t('product.addToCartFailed', { defaultValue: 'Add to cart failed' })),
        },
      );
    },
    [addToCartMutation, t],
  );

  // Why: 批3 P2-2 —— 卡片签名 (product)=>void，直传稳定 handler（消灭内联箭头）
  const handleCardPress = useCallback((p: Product) => router.push(`/product/${p.id}`), []);

  // Why: 批3 A7 —— CategoryGrid 透传给 memo 化 CategoryItem 的回调稳定引用
  const handleCategoryPress = useCallback(
    (c: { id: string }) =>
      router.push({ pathname: '/(main)/categories', params: { categoryId: c.id } }),
    [],
  );
  const handleMorePress = useCallback(() => router.push('/(main)/categories'), []);

  // A-P2-1: banner/promo link 是后端可控数据（banner.linkValue 为 admin 可输入的
  //   linkType URL/PRODUCT/CATEGORY/NONE），不直接 push——完整匹配的动态段路由
  //   （/product/{id}）走 safeRoutePush 白名单（对齐 PushDeepLinkDelegate 先例）；
  //   其余一律不导航（不裸 push 回退，防止任意路径注入）。
  const handleBannerPress = useCallback((b: Banner) => {
    if (!b.link) return;
    const productMatch = /^\/product\/([A-Za-z0-9-]+)$/.exec(b.link);
    if (productMatch) {
      safeRoutePush((href) => router.push(href as never), '/product', productMatch[1]);
    }
    // 非 /product/{id} 形态（含 CATEGORY/URL/NONE 或异常值）→ 不导航（空降页面无承接）
  }, []);

  const handlePromoPress = useCallback((p: Promotion) => {
    // Promotion.link 由后端 home.entries.ts 静态白名单下发，但仍按下发数据对待：
    // 仅放行已知静态路径前缀，非匹配不导航
    if (/^\/(product\/list|coupons|profile)(\?.*)?$/.test(p.link)) {
      router.push(p.link as never);
    }
  }, []);

  // 方案A（奇偶分列）：renderMasonryItem 不再被 FlatList 消费（无 renderItem 契约），
  //   改收 Product 直出卡片（key 由分列 map 上下文的卡片 testID 承担；favorites 同款）
  const renderMasonryItem = useCallback(
    (item: Product) => (
      <MasonryProductCard
        key={item.id}
        product={item}
        badge={resolveBadges(item, t)[0]}
        onPress={handleCardPress}
        onAddToCart={handleBuyAgainAddToCart}
      />
    ),
    [t, handleBuyAgainAddToCart, handleCardPress],
  );
  // 历史决策链：C-P2-10/A-P2-2 曾改 FlatList(numColumns=2) 承担滚动（救虚拟化）；主理人
  //   实测发现 numColumns 行对齐导致「顶部对齐网格、非瀑布流」（方案A 拍板 20261016），
  //   改回奇偶分列 ScrollView（favorites/search 先例，真错落）——虚拟化让位视觉语义，
  //   量级一页 20 条内可接受（收藏页同款取舍）。dashboard 区块收 renderDashboardHeader、
  //   Buy Again 横滑 renderBuyAgainFooter（实测Bug修复 #7B 板块顺序：推荐在前、再次购买在后）。
  //   loading/error/空列表三态时退回 ScrollView 包 dashboard 区（区块少非热路径）。
  const renderDashboardHeader = useCallback(
    () => (
      <>
        {/* 搜索栏 */}
        <View style={styles.searchSection}>
          <Pressable
            onPress={() => router.push('/search')}
            style={({ pressed }) => [
              styles.searchCard,
              {
                backgroundColor: colors['surface-container-lowest'],
                borderColor: colors['outline-variant'],
              },
              shadowPresets.sm,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="search"
          >
            <Icon symbol="search" size={22} color={colors.outline} />
            <Text style={[styles.searchPlaceholder, { color: colors['on-surface-variant'] }]}>
              {t('home.searchPlaceholder')}
            </Text>
          </Pressable>
        </View>

        {/* Banner 轮播（弱网降级：跳过） */}
        {!shouldSkipNonEssential && banners && banners.length > 0 && (
          <View style={styles.bannerSection}>
            <BannerCarousel banners={banners} onBannerPress={handleBannerPress} />
          </View>
        )}

        {/* 分类入口 */}
        {categories && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
                {t('home.categories')}
              </Text>
              <Pressable
                onPress={() => router.push('/(main)/categories')}
                style={styles.seeAllBtn}
                accessibilityRole="button"
                accessibilityLabel={t('home.seeAllCategories')}
              >
                <Text style={[styles.seeAllText, { color: colors.primary }]}>
                  {t('common.seeAll')}
                </Text>
                <Icon symbol="chevron_right" size={16} color={colors.primary} />
              </Pressable>
            </View>
            <CategoryGrid
              categories={categories}
              // Why: 批3 A7 —— CategoryItem 为 React.memo，经 CategoryGrid 透传的回调须稳定引用
              onCategoryPress={handleCategoryPress}
              // Why: P6 V1f - 超 7 分类时第 8 格 More 跳全量分类页
              onMorePress={handleMorePress}
            />
          </View>
        )}

        {/* PromoDock - 横排功能停靠栏（V3c 无标题） */}
        <View style={styles.section}>
          <PromoDock promotions={promotions ?? []} onPress={handlePromoPress} />
        </View>

        {/* Tais Divider（保留 HTML 装饰）——人工验收定稿：移至 PromoDock 下方 + 上下留白收窄 */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors['outline-variant'] }]} />
          <TaisDivider />
          <View style={[styles.dividerLine, { backgroundColor: colors['outline-variant'] }]} />
        </View>

        {/* 推荐商品标题 + 状态行（瀑布流列表主体在 FlatList data） */}
        <View style={[styles.sectionHeader, styles.recommendHeader]}>
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
            {t('home.recommend')}
          </Text>
          {/* Why: 换一批按钮 批2（清债微批修正）—— epoch++ 回首屏复位（D3 方案 B），isFetching 防连点 */}
          <View style={styles.headerActions}>
            <Pressable
              testID="home-recommend-change-batch"
              onPress={handleRecommendChangeBatch}
              disabled={isFetchingRecommend}
              style={({ pressed }) => [styles.changeBatchBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={t('home.changeBatch')}
            >
              <Icon
                symbol="refresh"
                size={16}
                color={isFetchingRecommend ? colors.outline : colors.primary}
              />
              <Text
                style={[
                  styles.seeAllText,
                  { color: isFetchingRecommend ? colors.outline : colors.primary },
                ]}
              >
                {t('home.changeBatch')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/product/list')}
              style={styles.seeAllBtn}
              accessibilityRole="button"
              accessibilityLabel={t('home.seeAllProducts')}
            >
              <Text style={[styles.seeAllText, { color: colors.primary }]}>
                {t('common.seeAll')}
              </Text>
              <Icon symbol="chevron_right" size={16} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      </>
    ),
    [
      banners,
      categories,
      colors,
      handleBannerPress,
      handleCategoryPress,
      handleMorePress,
      handlePromoPress,
      handleRecommendChangeBatch,
      isFetchingRecommend,
      promotions,
      shouldSkipNonEssential,
      t,
    ],
  );

  // 实测Bug修复 #7B：Buy Again 整块移 ListFooterComponent（推荐在前、再次购买在后，对齐原型）
  // 客户画像批3 B8：常买组合板块挂在 Buy Again 上方（组合=整包动作，清单=逐卡加购，层级区分）
  const renderBundleSection = useCallback(() => {
    // 空组合（匿名/无历史/无共现/门禁关）整块隐藏（契约语义）
    if (!bundle || !bundle.seed || bundle.items.length === 0) return null;
    return (
      <View style={[styles.buyAgainSection, styles.bundleSection]}>
        <View style={[styles.sectionHeader, styles.buyAgainHeader]}>
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
            {t('home.bundleTitle')}
          </Text>
          <Icon symbol="shopping_basket" size={20} color={colors.outline} />
        </View>
        <View
          style={[
            styles.bundleCard,
            {
              backgroundColor: colors['surface-container-lowest'],
              borderColor: colors['outline-variant'],
            },
            shadowPresets.sm,
          ]}
        >
          {bundleItems.map((item) => (
            <SmallProductCard
              key={item.id}
              testID={`bundle-card-${item.id}`}
              product={item}
              onPress={handleCardPress}
              onAddToCart={handleBuyAgainAddToCart}
            />
          ))}
        </View>
        <Pressable
          testID="home-bundle-add-all"
          onPress={handleBundleAddAll}
          disabled={bundlePending}
          style={({ pressed }) => [
            styles.bundleAddAllBtn,
            { borderColor: colors.primary },
            pressed && !bundlePending && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('home.bundleAddAll')}
        >
          {bundlePending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Icon symbol="add" size={16} color={colors.primary} />
          )}
          <Text
            style={[styles.seeAllText, { color: bundlePending ? colors.outline : colors.primary }]}
          >
            {t('home.bundleAddAll')}
          </Text>
        </Pressable>
      </View>
    );
  }, [
    bundle,
    bundleItems,
    bundlePending,
    colors,
    handleBundleAddAll,
    handleCardPress,
    handleBuyAgainAddToCart,
    t,
  ]);

  const renderBuyAgainFooter = useCallback(
    () => (
      <View style={styles.buyAgainSection}>
        <View style={[styles.sectionHeader, styles.buyAgainHeader]}>
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
            {t('order.actions.repurchase')}
          </Text>
          {/* Why: 换一批按钮 批2（清债微批修正）—— epoch++ 回首屏复位（D3 方案 B），isFetching 防连点 */}
          {/* 追修 P3-4：换一批+history 包进右侧组——sectionHeader 是 space-between，
              三顶层子元素会把按钮挤到正中间（推荐板块 headerActions 同款做法） */}
          <View style={styles.headerActions}>
            <Pressable
              testID="home-buy-again-change-batch"
              onPress={handleBuyAgainChangeBatch}
              disabled={buyAgainFetching}
              style={({ pressed }) => [styles.changeBatchBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={t('home.changeBatch')}
            >
              <Icon
                symbol="refresh"
                size={16}
                color={buyAgainFetching ? colors.outline : colors.primary}
              />
              <Text
                style={[
                  styles.seeAllText,
                  { color: buyAgainFetching ? colors.outline : colors.primary },
                ]}
              >
                {t('home.changeBatch')}
              </Text>
            </Pressable>
            {/* 批3 P2-1 修复：B1 常购清单页导航入口（原孤儿页零入口）——
                「查看全部」跳 /product/frequently-bought，复用 common.seeAll 现有 key；
                仅登录态展示（匿名 buy-again 是销量兜底切片，入口跟语义走） */}
            {isAuthenticated && (
              <Pressable
                testID="home-buy-again-view-all"
                onPress={() => router.push('/product/frequently-bought')}
                style={({ pressed }) => [styles.changeBatchBtn, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={t('common.seeAll')}
              >
                <Icon symbol="chevron_right" size={16} color={colors.primary} />
                <Text style={[styles.seeAllText, { color: colors.primary }]}>
                  {t('common.seeAll')}
                </Text>
              </Pressable>
            )}
            <Icon symbol="history" size={20} color={colors.outline} />
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hScroll}
        >
          {buyAgainList.map((item) => (
            // Why: P1 - 替换内联 buyAgainCard 为统一 SmallProductCard（方案 §4）
            <SmallProductCard
              key={item.id}
              product={item}
              onPress={handleCardPress}
              onAddToCart={handleBuyAgainAddToCart}
            />
          ))}
        </ScrollView>
      </View>
    ),
    [
      buyAgainList,
      colors,
      handleBuyAgainAddToCart,
      handleBuyAgainChangeBatch,
      handleCardPress,
      buyAgainFetching,
      isAuthenticated,
      t,
    ],
  );

  // B1 常购清单入口（批3 P2-1 修复）
  // A-P2-2: dashboard 三态（loading/error/空列表）退回 ScrollView——瀑布流无数据时
  //   FlatList 仅剩 header（等价原 ScrollView 布局）；有数据才走 FlatList 主体
  const dashboardFallback = useCallback(
    () => (
      <ScrollView
        style={[styles.scrollArea, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomReserve }]}
        showsVerticalScrollIndicator={false}
      >
        {renderDashboardHeader()}
        {isLoading && <ActivityIndicator color={colors.primary} style={styles.loader} />}
        {isError && <ErrorState message={t('errors.products')} onRetry={() => refetch()} />}
        {/* #7B：fallback 态 Buy Again 仍渲染（与 FlatList Footer 同源，板块不丢） */}
        {renderBundleSection()}
        {renderBuyAgainFooter()}
      </ScrollView>
    ),
    [
      bottomReserve,
      colors,
      isLoading,
      isError,
      refetch,
      renderDashboardHeader,
      renderBundleSection,
      renderBuyAgainFooter,
      t,
    ],
  );

  return (
    <PageErrorBoundary pageName="home">
      {/* Why: edges 仅 top —— header 红底需避状态栏。bottom 不需 edges：
        列表的 scrollContent.paddingBottom(xxl*2=96px) 兜底浮动 BottomNav + 底部手势条
        （主 tab 是自定义 BottomNav 浮层非系统 TabBar，故 home 走 paddingBottom 而非 edges bottom，审查 Q3）*/}
      <SafeAreaWrapper edges={['top']} style={{ backgroundColor: colors.primary, flex: 1 }}>
        <LinearGradient
          {...gradientPresets.brand}
          colors={[colors.primary, colors['primary-container']]}
          style={styles.headerBg}
        >
          <StatusBarConfig />
          {/* Fix-9: header tais-pattern 叠加（HTML 第 128 行 opacity-20） */}
          <View style={styles.headerPatternOverlay} pointerEvents="none">
            <TaisPattern width={400} height={200} opacity={0.2} />
          </View>
          {/* Sticky Header — Logo + 定位 + 消息红点 */}
          <View style={styles.headerRow}>
            <View style={styles.brandCol}>
              <Logo size={32} />
              <Text style={styles.brandName} accessibilityRole="header">
                {t('home.appName')}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/address/map')}
              style={styles.locationChip}
              accessibilityRole="button"
              accessibilityLabel={t('home.locationLabel')}
            >
              <Icon symbol="location_on" size={13} color={ON_PRIMARY} />
              <Text style={styles.locationText} numberOfLines={1}>
                {t('home.locationLabel')}
              </Text>
              <Icon symbol="expand_more" size={13} color={ON_PRIMARY} />
            </Pressable>
            <Pressable
              testID="home-messages"
              onPress={() => router.push('/service/notifications')}
              style={styles.msgBtn}
              accessibilityRole="button"
              accessibilityLabel={t('home.messagesLabel')}
            >
              <Icon symbol="mail" size={24} color={ON_PRIMARY} />
              {(unreadCount ?? 0) > 0 && (
                // 批B B3：真实未读数（原硬编码 2 已删）。
                // P2-1 修复（方案a）：底色传语义 error 红（light #C62828 / dark #EF9A9A 深红），
                // Badge label 恒用 colors['on-primary']（light 白 / dark 深红）→ 两主题均红字白底可读；
                // 原传 ON_PRIMARY 白底在 light 下白字白底不可见（审查 P2-1）
                <Badge
                  count={unreadCount ?? 0}
                  variant="number"
                  color={colors.semantic.error}
                  accessibilityLabel={t('home.unreadBadge', { count: unreadCount ?? 0 })}
                  style={styles.msgBadgePosition}
                />
              )}
            </Pressable>
          </View>
          {/* Uma Lulik Skyline 过渡（header → body） */}
          <View style={styles.skylineRow}>
            <UmaLulikSkyline height={24} />
          </View>
        </LinearGradient>

        {/* Delivery Tip — 黄色横条 */}
        <View style={[styles.deliveryTip, { backgroundColor: colors.cultural.amber }]}>
          <Icon symbol="local_shipping" size={18} color={ON_AMBER} />
          <Text style={styles.deliveryTipText}>{t('home.deliveryTip')}</Text>
        </View>

        {isLoading || isError || recommendList.length === 0 ? (
          dashboardFallback()
        ) : (
          // 方案A（主理人拍板 20261016，回看批7 审查语境）：奇偶分列两列瀑布流——
          //   对齐 favorites/search 先例（真错落，同列独立堆叠），代价是放弃 FlatList
          //   虚拟化（A-P2-2 动机），推荐位量级一页 20 条内可接受（收藏页同款取舍）；
          //   dashboard 区块/Buy Again 沿用原 header/footer 渲染函数挂 ScrollView
          <ScrollView
            style={[styles.scrollArea, { backgroundColor: colors.background }]}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomReserve }]}
            showsVerticalScrollIndicator={false}
          >
            {renderDashboardHeader()}
            <View style={styles.masonryRow}>
              {/* 方案A（20261023）：i%2 奇偶分列 → 累计高度均衡分列（splitMasonryBalanced）——
                  原奇偶分列两列高度纯随机，加载到底左列长右列空一截（用户实测） */}
              <View style={styles.masonryCol}>
                {masonryCols[0].map((item) => renderMasonryItem(item))}
              </View>
              <View style={styles.masonryCol}>
                {masonryCols[1].map((item) => renderMasonryItem(item))}
              </View>
            </View>
            {/* Why: 首页推荐展示 批2 ——「加载更多」三态（masonryRow 与 Buy Again 之间）：
                hasNextPage 可点追加 / isFetchingNextPage loading 防连点 / 20261024 方案②
                到底态换「收起推荐」文字链（D4 按钮消失改为收起入口，列表 >6 条才出现） */}
            {hasNextPage ? (
              <View style={styles.loadMoreRow}>
                <Pressable
                  testID="home-recommend-load-more"
                  onPress={handleLoadMore}
                  disabled={isFetchingNextPage}
                  style={({ pressed }) => [
                    styles.loadMoreBtn,
                    { borderColor: colors['outline-variant'] },
                    pressed && !isFetchingNextPage && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.loadMore')}
                >
                  {isFetchingNextPage ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                      {t('home.loadMore')}
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : (
              recommendList.length > RECOMMEND_LIMIT && (
                // 20261024 人工验收修订：到底态拆左右两端——左侧居中提示「已经到底啦」，
                // 右侧「收起推荐」文字链（原两态各占一行居中）
                <View style={styles.recommendEndRow}>
                  <Text style={[styles.listEndText, { color: colors['on-surface-variant'] }]}>
                    {t('home.listEnd')}
                  </Text>
                  <Pressable
                    testID="home-recommend-collapse"
                    onPress={handleRecommendCollapse}
                    disabled={isFetchingRecommend || isFetchingNextPage}
                    style={({ pressed }) => [styles.changeBatchBtn, pressed && { opacity: 0.7 }]}
                    accessibilityRole="button"
                    accessibilityLabel={t('home.collapseRecommend')}
                  >
                    <Icon symbol="expand_less" size={16} color={colors.primary} />
                    <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                      {t('home.collapseRecommend')}
                    </Text>
                  </Pressable>
                </View>
              )
            )}
            {renderBundleSection()}
            {renderBuyAgainFooter()}
          </ScrollView>
        )}
      </SafeAreaWrapper>
    </PageErrorBoundary>
  );
}

const styles = StyleSheet.create({
  headerBg: {
    paddingBottom: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  headerPatternOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  scrollArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 0,
    // Why: 底部留白 paddingBottom 由 render 期内联注入（styles 静态段读不到组件作用域值）
    //   原静态 spacing.xxl*2=96px 已删，见 render 处
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout['container-margin'],
    paddingVertical: spacing.md,
    gap: spacing.md,
    zIndex: 1,
  },
  brandCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandName: {
    ...typography.h2,
    color: ON_PRIMARY,
    fontWeight: '700',
  },
  // Why: 位置胶囊 - 和 PrimaryHeader 统一样式，半透明白底圆角
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: 150,
  },
  locationText: {
    ...typography['body-sm'],
    color: ON_PRIMARY,
    fontSize: 12,
    flexShrink: 1,
  },
  msgBtn: {
    position: 'relative',
    padding: spacing.xs,
  },
  // 批B B3：Badge absolute 定位（原 msgBadge/msgBadgeText 内联样式删，Badge 自带底色圆角）
  msgBadgePosition: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  skylineRow: {
    marginTop: -1,
    zIndex: 1,
  },
  deliveryTip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  deliveryTipText: {
    ...typography['label-caps'],
    color: ON_AMBER,
    fontSize: 10,
  },
  searchSection: {
    paddingHorizontal: layout['container-margin'],
    paddingTop: spacing.md,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchPlaceholder: {
    ...typography['body-sm'],
  },
  bannerSection: {
    // V15：区块节奏 24px 对齐原型（原误映射 xl(32)，HTML 24px 应映射 lg）
    marginTop: spacing.lg,
  },
  section: {
    // V15：区块节奏 24px 对齐原型（原误映射 xl(32)）
    marginTop: spacing.lg,
    paddingHorizontal: layout['container-margin'],
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.h3,
    fontWeight: '700',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  // Why: 换一批按钮 批2 —— 按钮组容器（推荐板块 header 三个元素并排）
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  changeBatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  seeAllText: {
    ...typography['label-caps'],
    fontSize: 12,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout['container-margin'],
    // Why: 人工验收 2026-10-23 定稿——Divider 移至 PromoDock 下方后留白收窄 lg(24) → sm(12)
    paddingVertical: spacing.sm,
    gap: spacing.md,
    // V15：区块节奏 24px 对齐原型（原误映射 xl(32)）
    marginTop: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  recommendHeader: {
    // Why: 批5 主理人实测反馈——标题紧贴上方 PromoDock（垂直间距 0，A-P2-2 抽 header 时丢失）；
    //      加 marginTop 对齐全页 V15 24px 区块节奏（其余区块均 spacing.lg）
    marginTop: spacing.lg,
    paddingHorizontal: layout['container-margin'],
    marginBottom: spacing.md,
  },
  loader: {
    paddingVertical: spacing.lg,
  },
  hScroll: {
    paddingHorizontal: layout['container-margin'],
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  // Why: §9-4 瀑布流两列容器（替 recommendCard 横滑）
  masonryRow: {
    // 方案A：奇偶分列行容器（favorites.tsx masonryRow 同构）——横向 padding + 列间距
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: layout['container-margin'],
  },
  masonryCol: {
    // 每列等宽、列内卡片纵向堆叠（真错落；favorites masonryCol 同构）
    flex: 1,
    gap: spacing.md,
  },
  // Why: 首页推荐展示 批2 ——「加载更多」按钮行（居中，宽约 40% 收敛视觉）
  loadMoreRow: {
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: layout['container-margin'],
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '50%',
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  loadMoreText: {
    ...typography['label-caps'],
    fontSize: 12,
  },
  // Why: 20261024 人工验收——到底态一行两端：提示语居中（flex:1 + textAlign center），
  //   收起按钮贴右（不复用 loadMoreRow 的纯居中布局）
  recommendEndRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: layout['container-margin'],
  },
  listEndText: {
    flex: 1,
    textAlign: 'center',
    ...typography['label-caps'],
    fontSize: 12,
  },
  buyAgainSection: {
    // Why: P6 S5 - Buy Again marginTop xl(32) -> lg(24)，页尾区块视觉收束
    marginTop: spacing.lg,
  },
  // Why: 客户画像批3 B8 —— 常买组合板块（组合整包加购，挂 Buy Again 上方）
  bundleSection: {
    marginTop: spacing.lg,
  },
  bundleCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginHorizontal: layout['container-margin'],
    padding: spacing.md,
    borderRadius: borderRadius?.lg ?? 16,
    borderWidth: 1,
  },
  bundleAddAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    marginHorizontal: layout['container-margin'],
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  buyAgainHeader: {
    paddingHorizontal: layout['container-margin'],
    marginBottom: spacing.md,
  },
  // Why: 可点击主体（图片+名称+价格）
  // Why: 加购按钮行，靠右对齐
});
