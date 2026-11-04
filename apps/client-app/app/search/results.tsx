// SearchResultPage — 还原自 SearchResultPage.html（319 行）
// HTML → RN 行数比：319 → ~370（含样式）
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 116%）
// Fix-11: Primary tais-pattern Header + 内嵌只读搜索 + 排序栏 + 结果计数 + Load More
import { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  ScrollView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ProductCard } from '@/components/business/ProductCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import { CartIconButton } from '@/components/business/CartIconButton/CartIconButton';
import { PageSkeleton } from '@/components/feedback/PageSkeleton/PageSkeleton';
// P8-6 R3/R5：Recommended 复用 MasonryProductCard + resolveBadges（与首页/P7 统一）
import { MasonryProductCard } from '@/components/business/MasonryProductCard/MasonryProductCard';
import { SearchBar } from '@/components/business/SearchBar';
import { resolveBadges } from '@/utils/resolveBadges';
import { dedupeById } from '@/utils/dedupeById';
import { shouldSuggest } from '@/utils/searchSuggestGate';
import { splitMasonryBalanced } from '@/utils/splitMasonryBalanced';
import { toast } from '@/store/toastStore';
import {
  useProductSearch,
  useProducts,
  type ProductSortKeyWithPending,
} from '@/services/queries/useProducts';
import { useSearchSuggest } from '@/services/queries/useSearchSuggest';
import { useSearchHot } from '@/services/queries/useSearchHot';
import { useCategories } from '@/services/queries/useCatalog';
import { SuggestPanel } from '@/components/business/SuggestPanel';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { useLocalizer } from '@/i18n';
import { buildSortOptions } from '@/utils/searchSortOptions';
import { trackSearchClick } from '@/services/behavior';
import { useCart, useAddToCart } from '@/services/queries/useCart';
import { useDebounce } from '@/hooks/useDebounce';
import type { Product } from '@/types';

// P8 审查 Q1: 红底白字/白图标固定（header primary 底），dark 不变（同 P6/P7 ON_PRIMARY 模式）
const ON_PRIMARY = '#ffffff';

// P8-2 i18n：排序 value(labelKey) 分离。key 传后端 sortBy，labelKey 走 t()。
// all 复用 common.all，不新增 search.sort.all（避免重复 key）。
// P8-5: ProductSortKey 从 service 导入（与后端 ProductSortBy 一致），不本地重定义
// 盒马式 6 档方案②（20261104）：后端 8ea63c2 已交付 priceDesc（SORT_BY_ORDERBY +
//   openapi 枚举，live 验证 sortBy=priceDesc 200 且 priceMin 降序），档位放开。
//   回退开关：后端若回滚，改回 false 即置灰（前端 narrowing 兜底仍防误发）。
const PRICE_DESC_ENABLED = true;
// P3-3（20261105）：SORT_OPTIONS 移 src/utils/searchSortOptions.ts 纯函数（disabled 分支补测），
//   此处仅保留回退开关常量，语义同前（后端 8ea63c2 已交付 priceDesc，回滚改 false 即置灰）。
const SORT_OPTIONS = buildSortOptions(PRICE_DESC_ENABLED);

// 拍板项3（20261105）：web 端结果页限宽居中——大屏两列网格拉满屏不可读（rice 仅 1 条结果
//   时卡片独吃整行尤甚）。720px 常见 web 阅读宽；native 不生效。宽值经 onLayout 量测天然
//   参与 cellBasis 计算，无需在 cellBasis 特判。
const WEB_MAX_WIDTH = 720;

export default function SearchResultsPage() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ q: string; categoryId?: string }>();
  // Filter Tags 联动（2026-11-05）：index 页分类胶囊跳入带 categoryId（q 可空）——
  //   空词+纯分类过滤（后端 listProducts 独立支持），useProductSearch enabled 已放行此路径
  const categoryId =
    typeof params.categoryId === 'string' && params.categoryId ? params.categoryId : undefined;
  const keyword = useDebounce(params.q ?? '', 300);
  const { t } = useTranslation();
  // activeSort 类型取 ProductSortKeyWithPending（含 priceDesc）——档位 UI 先行，
  //   priceDesc disabled 时不可达（Pressable disabled），真启用等后端契约 sync
  const [activeSort, setActiveSort] = useState<ProductSortKeyWithPending>('all');
  // F3：结果页联想三件套（同 index.tsx 模式）——suggestOpen 控显隐、debounce 300 防抖、
  //   onBlur 延迟 200ms 收起（SuggestPanel 项 onPress 先触发）。词提交复用 handleSubmitSearch。
  // 产品拍板 2026-11-04：联想只留词——商品联想 hook 摘除（isProductsLoading 恒 false，
  //   productsLen 恒 0，恢复混合模式见 SuggestPanel.showProducts）
  // 初始 false（20261105 验收修复）：从首页点联想词跳入时 debouncedQuery 非空，初始 true
  //   会让结果页自己的面板挂载即弹出叠在结果上（headless 实证 top:64 zIndex:10 面板残留）；
  //   面板只应在用户于结果页搜索框输入时出现（onSuggestTyping 重开）。
  const [suggestOpen, setSuggestOpen] = useState(false);
  // P2-1 审查修复（20261105）：live query 提升到页面层——面板/联想 hook 必须接用户正在敲的
  //   文本（Header 内部 state 之前未上提，面板弹出显示的是旧 params.q 的联想）。index.tsx
  //   同款口径：showSuggest/面板 query 用 live，useProductSearch 仍用 debounce(params.q)。
  const [liveQuery, setLiveQuery] = useState('');
  // 联想门槛单源 shouldSuggest（2026-11-04：CJK 单字放行，'米' 不再被 length>=2 误拦）
  const showSuggest = suggestOpen && shouldSuggest(liveQuery);
  // F3：面板 top 需动态让出红底 header（header 自治 insets.top，见 Header 组件）
  const insets = useSafeAreaInsets();
  const { data: hotList } = useSearchHot();
  const { data: suggestWords, isLoading: isWordsLoading } = useSearchSuggest(
    liveQuery,
    showSuggest,
  );
  const isProductsLoading = false;
  // Why: 长度先解构到独立变量——v5 data/isLoading discriminated 字段 correlated narrowing 规避（index.tsx 同款）
  const wordsLen = suggestWords?.length ?? 0;
  // 产品拍板 2026-11-04：商品区关闭，productsLen 恒 0（isSuggestLoading 公式保留结构，回开时填回）
  const productsLen = 0;
  const isSuggestLoading =
    // P3-2 审查登记（20261105）：isProductsLoading 恒 false → 整式当前恒 false（加载态死路，
    //   SuggestPanel 靠 words 空 + wordsLen 0 自然走空态）；商品联想回开时此式即恢复生效。
    isWordsLoading && isProductsLoading && wordsLen === 0 && productsLen === 0;
  // C方案 §7.4 - 空态 fallback 复用 hotList（slice 3 作 chips 补位，index.tsx 同款）
  const hotFallback = (hotList ?? [])
    .slice(0, 3)
    .map((item) => ({ word: item.word, searchCount: item.searchCount }));
  // P8-5 F2+F3：sortBy 变重查第一页（决策 2-B），onEndReached 触发 fetchNextPage（决策 3-B）
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useProductSearch(keyword, activeSort, categoryId);
  // Why: pages.flatMap 拼接所有已加载页；total 取首页（搜索结果总数，非累计已加载数）。
  //   后端 offset 分页排序不稳定时跨页重复商品 → 同 id 渲染两次 duplicate key（home 实证
  //   20261023），按 id 去重防渲染层炸；根治靠后端 ORDER BY tie-breaker（审查 Q4 收敛 util）。
  const results = useMemo(() => dedupeById(data?.pages.flatMap((p) => p.items) ?? []), [data]);
  const count = data?.pages[0]?.total ?? 0;

  // Filter Tags 联动（2026-11-05）：结果计数行显示分类名（纯分类浏览时 q 为空，标题只有计数）。
  //   index.tsx 同款口径：批1 A4 透传后 name 是 LocalizableText，显示走 localize()
  const localize = useLocalizer();
  const { data: categories } = useCategories();
  const categoryLabel = categoryId
    ? localize(categories?.find((c) => c.id === categoryId)?.name ?? '')
    : '';

  // P3-4 拍板（20261105）：flexBasis 精确像素替代 48.5% 近似——onLayout 量 FlatList 容器宽，
  //   扣 scrollContent 两侧 container-margin（padding 作用在内容上，行容器实际可用宽 =
  //   容器宽 - 2×margin），算 (可用宽 - gutter) / 2，单卡尾行与双卡行永远等宽（48.5% 近似
  //   依赖 columnGap 吃容差，换 gutter 值会漂）。量测前回退 48.5% 占位（首帧一致，回调后
  //   重渲染切精确值）。web 端容器限宽（WEB_MAX_WIDTH）天然参与量测，无需特判。
  const [gridWidth, setGridWidth] = useState<number | null>(null);
  const handleGridLayout = useCallback((e: LayoutChangeEvent) => {
    setGridWidth(e.nativeEvent.layout.width);
  }, []);
  const cellBasis =
    gridWidth !== null ? (gridWidth - layout['container-margin'] * 2 - layout.gutter) / 2 : '48.5%';

  // P8-5 F3：ScrollView 触底加载下一页（distanceFromBottom < 200）
  const handleScroll = ({ nativeEvent }: { nativeEvent: NativeScrollEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    if (distanceFromBottom < 200 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // P8-6 R1：Recommended 数据源 useProducts（与 P7/home 一致），去重过渡期可接受（方案 §2.4）
  const { data: realProducts } = useProducts();
  // Why: useMemo 包一层——下方 splitMasonryBalanced 的 useMemo 依赖它，裸 `?? []`
  //   每次 render 新引用会击穿 memo（react-hooks/exhaustive-deps 实测警告）
  const recommendList = useMemo(() => realProducts ?? [], [realProducts]);
  // Why: 20261023 方案A——奇偶分列改累计高度均衡分列（home 同款 splitMasonryBalanced）
  const [masonryCol1, masonryCol2] = useMemo(
    () => splitMasonryBalanced(recommendList),
    [recommendList],
  );
  const addToCartMutation = useAddToCart();
  // 批3 P2-2：卡片签名 (product)=>void，直传稳定 handler（消灭内联箭头）
  // 批5 G2 埋点：搜索结果点击 → SEARCH_CLICK（fire-and-forget 攒批上报）后再跳详情
  const handleCardPress = useCallback((p: Product) => {
    trackSearchClick(p.id);
    router.push(`/product/${p.id}`);
  }, []);
  // Why 独立 handler：Recommended 区非搜索结果（useProducts 热销切片），点击不计 SEARCH_CLICK，
  //   否则漏斗（搜索→点击→成交）对账时推荐点击会污染点击侧数字（P5-2 口径）
  const handleRecommendPress = useCallback((p: Product) => router.push(`/product/${p.id}`), []);
  // A-P2-2: useCallback 稳定化（memo 化卡片 props 浅比较，回调稳定才生效）
  const handleAddToCart = useCallback(
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
  const handleCardAdd = handleAddToCart;

  // A-P2-2: 结果网格 FlatList(numColumns=2) 现直接承担页面滚动（旧版嵌
  //   ScrollView(scrollEnabled=false) 内，虚拟化失效全量挂载）。
  //   行为零变更：行容器样式承接原 grid/gridCell（半 gutter 列 padding + 行距）；
  //   ProductCard onPress 签名是 (product) => void（非 () => void），直接传稳定 router 跳转。
  const renderResultItem = useCallback(
    ({ item }: { item: Product }) => (
      <View style={[styles.gridCell, { flexBasis: cellBasis as number }]}>
        {/* C-P3-10（批4 修复）：徽章走 resolveBadges 真实口径（Recommended 区同款），宁缺毋假 */}
        <ProductCard
          product={item}
          badge={resolveBadges(item, t)[0]}
          onPress={handleCardPress}
          imageHeight={176}
        />
      </View>
    ),
    [t, handleCardPress, cellBasis],
  );

  // P8-7: 顶部搜索框可编辑（同 P7 SearchBar + 麦克风）
  // Why: Header 用 key={params.q} 重挂载同步搜索词，避免 effect setState（react-hooks 规则）
  const { addRecent } = useRecentSearches();
  const handleSubmitSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      // 同 index.tsx：空词提交收起联想面板 + Toast（不静默失败）
      setSuggestOpen(false);
      toast.info(t('search.emptyKeyword'));
      return;
    }
    // P7 F1：搜索提交记录 Recent（AsyncStorage 持久化，index 页同款）
    addRecent(trimmed);
    // Why: 提交后必须收起面板（P1-1 审查 20261105）——Header key={params.q} 重挂载不触发
    //   onBlur，onSuggestBlur 的 200ms 收起不跑，面板会叠在新结果上（index.tsx 同款修复）。
    setSuggestOpen(false);
    // Why: setParams 刷新当前页（useProductSearch 自动重查），避免 push 堆路由栈
    router.setParams({ q: trimmed });
  };

  // P8-6: Recommended 渲染抽函数（结果分支 !hasNextPage + empty 分支共用）
  // Why: F1 修复（empty 分支实测）——section/masonryRow 自身无横向 padding：结果分支由
  //   footerSection 承担，empty 分支裸 ScrollView 无页级 padding → 推荐卡片顶到屏幕边缘。
  //   padding 统一落 footerSection（两分支共用，empty 分支渲染时包同款 View），section 不动。
  const renderRecommended = () =>
    recommendList.length > 0 ? (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
          {t('search.recommended')}
        </Text>
        <View style={styles.masonryRow}>
          <View style={styles.masonryCol}>
            {masonryCol1.map((product) => (
              <MasonryProductCard
                key={product.id}
                product={product}
                badge={resolveBadges(product, t)[0]}
                onPress={handleRecommendPress}
                onAddToCart={handleCardAdd}
              />
            ))}
          </View>
          <View style={styles.masonryCol}>
            {masonryCol2.map((product) => (
              <MasonryProductCard
                key={product.id}
                product={product}
                badge={resolveBadges(product, t)[0]}
                onPress={handleRecommendPress}
                onAddToCart={handleCardAdd}
              />
            ))}
          </View>
        </View>
      </View>
    ) : null;

  // A-P2-2: 排序栏/计数收进 ListHeaderComponent（旧版 FlatList 嵌 ScrollView
  //   (scrollEnabled=false) 使虚拟化失效、全量挂载）；onSort 稳定引用
  const handleSortPress = useCallback((key: ProductSortKeyWithPending) => setActiveSort(key), []);

  const renderListHeader = useCallback(
    () => (
      <>
        {/* Sort & Filter Bar */}
        <View
          style={[
            styles.sortWrap,
            {
              backgroundColor: colors['surface-container-lowest'],
              borderColor: colors['outline-variant'],
            },
          ]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.sortRow}>
              {SORT_OPTIONS.map((opt) => {
                const active = opt.key === activeSort;
                const label = t(opt.labelKey);
                return (
                  <Pressable
                    key={opt.key}
                    disabled={opt.disabled}
                    onPress={() => handleSortPress(opt.key)}
                    style={[
                      styles.sortPill,
                      active && { backgroundColor: colors['surface-container-high'] },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active, disabled: opt.disabled === true }}
                    accessibilityLabel={t('search.sort.a11y', { label })}
                  >
                    <Text
                      style={[
                        styles.sortText,
                        {
                          color: active
                            ? colors.primary
                            : opt.disabled
                              ? colors['outline-variant']
                              : colors['on-surface-variant'],
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Results Found 计数——纯分类浏览（q 空）时显示分类名前缀 */}
        <Text style={[styles.countText, { color: colors['on-surface-variant'] }]}>
          {categoryLabel
            ? `${categoryLabel} · ${t('search.resultCount', { count })}`
            : t('search.resultCount', { count })}
        </Text>
      </>
    ),
    [colors, count, handleSortPress, t, activeSort, categoryLabel],
  );

  return (
    <SafeAreaWrapper edges={['bottom']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBarConfig />
      <View
        style={
          Platform.OS === 'web'
            ? { width: '100%' as const, maxWidth: WEB_MAX_WIDTH, alignSelf: 'center', flex: 1 }
            : { flex: 1 }
        }
      >
        <Header
          key={params.q}
          initialKeyword={params.q ?? ''}
          onSubmitSearch={handleSubmitSearch}
          onSuggestTyping={(q) => {
            // P2-1：Header 回传 live 文本（面板联想源），并重开面板
            setLiveQuery(q);
            setSuggestOpen(true);
          }}
          onSuggestBlur={() => setTimeout(() => setSuggestOpen(false), 200)}
        />

        {/* F3：SuggestPanel 挂 Header 同级 absolute——top 动态算（header 红底自治 insets.top，
          不可复用 index 页固定 SEARCH_HEADER_H 常量），不随内容滚动，词提交复用 handleSubmitSearch。 */}
        {showSuggest && (
          <View
            style={[styles.suggestWrap, { top: insets.top + spacing.sm * 2 + 48 }]}
            pointerEvents="box-none"
          >
            <SuggestPanel
              words={suggestWords ?? []}
              products={[]}
              showProducts={false}
              query={liveQuery}
              isLoading={isSuggestLoading}
              hotFallback={hotFallback}
              onWordPress={handleSubmitSearch}
              onProductPress={(p) => router.push(`/product/${p.id}`)}
              onHotFallbackPress={handleSubmitSearch}
            />
          </View>
        )}

        {isLoading ? (
          // 批2 阶段2（D8 审计）：自实现 4 卡骨架拼装换 PageSkeleton(grid)，shimmer 流光统一
          <PageSkeleton variant="grid" />
        ) : isError ? (
          <ErrorState message={t('errors.products')} onRetry={() => refetch()} />
        ) : !results || results.length === 0 ? (
          // P8-6: empty 也给推荐延伸浏览（用户决策 2026-08-04）
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
            <EmptyState
              title={t('search.noResultTitle')}
              description={t('search.noResultDesc', { q: params.q ?? '' })}
              icon="package-variant"
            />
            {/* F1：empty 分支补 footerSection 同款横向 padding（结果分支由 FlatList footer 承担） */}
            <View style={styles.footerSection}>{renderRecommended()}</View>
          </ScrollView>
        ) : (
          // A-P2-2: 单列表容器——FlatList 直接承担滚动（虚拟化生效），筛选/计数挂
          //   ListHeaderComponent，Load More/Recommended 挂 ListFooterComponent
          <FlatList
            style={{ flex: 1 }}
            data={results}
            keyExtractor={(item: Product) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.grid}
            contentContainerStyle={styles.scrollContent}
            renderItem={renderResultItem}
            onLayout={handleGridLayout}
            ListHeaderComponent={renderListHeader}
            ListFooterComponent={
              <View style={styles.footerSection}>
                {/* P8-5 F3 真实分页：hasNextPage 时显示 Load More，无更多隐藏（替假 spinner） */}
                {(hasNextPage || isFetchingNextPage) && (
                  <View style={styles.loadMore}>
                    <View
                      style={[
                        styles.spinner,
                        {
                          borderColor: colors.outline,
                          borderTopColor: colors.primary,
                        },
                      ]}
                    />
                    <Text style={[styles.loadMoreText, { color: colors['on-surface-variant'] }]}>
                      {t('search.loadingMore')}
                    </Text>
                  </View>
                )}

                {/* P8-6 R2/R4：Recommended 瀑布流，分页结束后（!hasNextPage）显示，避免穿插每页底部 */}
                {!hasNextPage && renderRecommended()}
              </View>
            }
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            initialNumToRender={6}
            maxToRenderPerBatch={4}
            windowSize={5}
          />
        )}
      </View>
    </SafeAreaWrapper>
  );
}

// Primary tais-pattern Header + 可编辑搜索框（P8-7 改 SearchBar，同 P7）
// F3：新增 onSuggestTyping/onSuggestBlur 透传——输入重开联想面板、失焦延迟收起（index.tsx 同款时序）
// P2-1（20261105）：onSuggestTyping 回传 live 文本——面板联想源需要用户正在敲的文本，
//   该文本此前只在 Header 内部 state，页面层拿不到（面板显示旧词联想）
function Header({
  initialKeyword,
  onSubmitSearch,
  onSuggestTyping,
  onSuggestBlur,
}: {
  initialKeyword: string;
  onSubmitSearch: (q: string) => void;
  onSuggestTyping: (q: string) => void;
  onSuggestBlur: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const handleBack = useSafeBack();
  // P8 审查 B1: Header 自治 top safe area（外层 edges=['bottom'] 排除 top，红底 Header 需自己留状态栏空间）
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState(initialKeyword);
  // P8-4 F4：购物车角标接真实数量（cart.totalItems），未登录/空购物车隐藏角标
  const { data: cart } = useCart();
  const cartCount = cart?.totalItems ?? 0;
  return (
    <View
      style={[
        styles.header,
        { backgroundColor: colors.primary, paddingTop: insets.top + spacing.sm },
        shadowPresets.lg,
      ]}
    >
      <View style={styles.headerPattern} pointerEvents="none">
        <TaisPattern width={390} height={80} opacity={0.2} />
      </View>
      <View style={styles.headerRow}>
        <Pressable
          onPress={handleBack}
          hitSlop={8}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Icon symbol="arrow_back" size={24} color={ON_PRIMARY} />
        </Pressable>

        {/* P8-7: 可编辑搜索框（SearchBar + 麦克风，同 P7），提交触发 setParams 刷新当前页 */}
        <View style={styles.searchBarInline}>
          <SearchBar
            value={query}
            onChange={(q) => {
              setQuery(q);
              // F3：输入时重新打开面板 + 回传 live 文本（P2-1，onBlur 延迟收起后重新输入需重开）
              onSuggestTyping(q);
            }}
            onBlur={onSuggestBlur}
            onSubmit={onSubmitSearch}
            variant="card"
            showMic
            placeholder={t('search.placeholder')}
          />
        </View>

        {/* 购物车 + 角标——P1-21 收敛 CartIconButton（原自绘白底红边角标废弃，统一 error 红 Badge） */}
        <CartIconButton
          count={cartCount}
          iconColor={ON_PRIMARY}
          onPress={() => router.push('/cart')}
          accessibilityLabel={t('cart.a11y.itemCount', { count: cartCount })}
          style={styles.headerBtn}
          hitSlop={8}
          badgeStyle={styles.cartBadge}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: layout['container-margin'],
    // P8 审查 B1: paddingTop 内联动态（insets.top + spacing.sm），这里只留 bottom
    paddingBottom: spacing.sm,
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    zIndex: 2,
  },
  headerBtn: {
    position: 'relative',
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // P8-7: SearchBar 占满中间（arrow 与购物车之间），同 P7 searchBarInline
  searchBarInline: {
    flex: 1,
  },
  // P1-21：角标本体走 CartIconButton/Badge，这里只留定位（原白底红边自绘形态废弃）
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 2,
  },
  // F3：联想面板定位——top 由 insets 动态算（header = insets.top + sm + 48 + sm，inline 覆盖），
  //   覆盖在 sortWrap 之上（zIndex 10），横向对齐 container-margin（index.tsx suggestWrap 同构）
  suggestWrap: {
    position: 'absolute',
    left: layout['container-margin'],
    right: layout['container-margin'],
    zIndex: 10,
  },
  scrollContent: {
    padding: layout['container-margin'],
    paddingBottom: spacing.xxl * 2,
  },
  // A-P2-2：ListFooterComponent 的 Recommended 区左对齐外边距（原 scrollContent padding 由 header 承担）
  footerSection: {
    paddingHorizontal: layout['container-margin'],
  },
  sortWrap: {
    borderRadius: borderRadius.xl,
    padding: spacing.xs,
    borderWidth: 1,
    marginBottom: spacing.md,
    ...shadowPresets.sm,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sortPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  sortText: {
    ...typography['label-caps'],
    fontSize: 12,
  },
  countText: {
    ...typography['body-sm'],
    marginBottom: spacing.lg,
  },
  grid: {
    // FlatList numColumns=2 行容器。方案A 20261105 对齐原型（SearchResultPage.html:195
    //   grid-cols-2 gap-x-gutter gap-y-lg）：列 gap 12（gutter）+ 行距 24（lg，原型 gap-y-lg），
    //   行列异值——原 gap:16 单值两向同吃，列偏宽行偏窄（用户实测体感）。20261104 方案B 废弃。
    // 旧负 margin + gridCell 半 padding 组合删除：与 columnGap 双重叠加（列间实测 16≠原型 12）。
    // 行距必须用 marginBottom：columnWrapperStyle 的行是兄弟节点（各自独立 flex 容器），
    //   rowGap 打在行容器上永不触发（headless 实测行间贴死 0px，20261105 验收打回）。
    flexDirection: 'row',
    columnGap: layout.gutter,
    marginBottom: spacing.lg,
  },
  gridCell: {
    // Why: P3-4 拍板（20261105）flexBasis 改运行时注入精确像素（renderResultItem 内联覆盖，
    //   见 cellBasis 计算）——此处的 48.5% 仅作 onLayout 回调前的首帧占位（量测前回退值）。
    //   flex:1 在奇数尾行单卡时独吃整行宽（实测 cell 716 vs 双卡 352）卡片拉长；flexBasis
    //   定宽后单卡停在左列，宽度与双卡行一致（右侧自然留白，盒马式网格）。
    flexBasis: '48.5%',
  },
  loadMore: {
    paddingVertical: spacing.xl * 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 4,
  },
  loadMoreText: {
    ...typography['body-sm'],
  },
  // P8-6 R4：Recommended 两列瀑布流（同 home.tsx / P7 search/index masonry 模式）
  // A-P2-2：原 scrollContent 的横向 padding 由 footerSection 承担（FlatList footer 无页级 padding）
  section: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    fontWeight: '600',
  },
  masonryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  masonryCol: {
    flex: 1,
    gap: spacing.md,
  },
});
