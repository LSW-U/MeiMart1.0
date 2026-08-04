// SearchPage — 还原自 SearchPage.html（337 行）
// HTML → RN 行数比：337 → ~390（含样式）
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 116%）
// Fix-10: 重建 5 个缺失模块（Primary Header / Filter Tags / Recent / Popular / Recommended）
import { useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import Svg, { Polygon } from 'react-native-svg';
import { useTheme, spacing, layout, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { SearchBar } from '@/components/business/SearchBar';
// Why: P7 §2.4 R1 - Recommended 统一用 MasonryProductCard（与首页同一组件），删旧 ProductCard
import { MasonryProductCard } from '@/components/business/MasonryProductCard/MasonryProductCard';
import { resolveBadges } from '@/utils/resolveBadges';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import { useProducts } from '@/services/queries/useProducts';
import { useSearchHot } from '@/services/queries/useSearchHot';
// C方案（搜索预览）：联想双 hook + 面板组件 + debounce
import { useSearchSuggest, useSearchProductsSuggest } from '@/services/queries/useSearchSuggest';
import { SuggestPanel } from '@/components/business/SuggestPanel';
import { useDebounce } from '@/hooks/useDebounce';
import { useCategories } from '@/services/queries/useCatalog';
import { useAddToCart, useCart } from '@/services/queries/useCart';
import { toast } from '@/store/toastStore';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import type { Product } from '@/types';
import { useTranslation } from 'react-i18next';

// Why: 红底白字固定（header primary 底 + Filter Tag active 底 + 热搜榜 rank 1/2），dark 不变
//   同 home.tsx ON_PRIMARY 模式（P6 审查 Q1），不用 colors['on-primary']（dark 翻 #690005 裂色）
const ON_PRIMARY = '#ffffff';
// Why: 金底黑字固定（热搜榜 rank 3 amber 底），dark 不变（同 home.tsx ON_AMBER 模式）
const ON_AMBER = '#000000';

// Why: P3 联调（2026-07-31）- 热搜榜接后端 GET /client/search/hot，删 POPULAR_SEARCHES 写死 + fallbackSales 派生
//   后端返 { word, searchCount }[]，rank=idx+1，heat=searchCount 格式化，word 是实际词非 i18n key

// Why: RECENT_SEARCHES 删 - Commit 3 接 useRecentSearches hook（AsyncStorage 持久化）
// Why: FILTER_TAGS 删 - 改 useCategories() 动态分类（P7 I7）

// Why: 推荐商品改用 useProducts 真实数据（避免 mock id 'rec-*' 跳转详情 404）
// Why: P7 §2.4 R4 - badge 改 resolveBadges 派生（删 getRecommendBadge 轮转）

// Uma Lulik curve 锯齿底边（HTML clip-path polygon，22 个点 zigzag）
function UmaLulikCurve({ color }: { color: string }) {
  const width = 390;
  const height = 176;
  const points = [
    '0,0',
    `${width},0`,
    `${width},149`,
    '370.5,154',
    '351,149',
    '331.5,154',
    '312,149',
    '292.5,154',
    '273,149',
    '253.5,154',
    '234,149',
    '214.5,154',
    '195,149',
    '175.5,154',
    '156,149',
    '136.5,154',
    '117,149',
    '97.5,154',
    '78,149',
    '58.5,154',
    '39,149',
    '19.5,154',
    '0,149',
  ].join(' ');
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Polygon points={points} fill={color} />
    </Svg>
  );
}

export default function SearchIndexPage() {
  const handleBack = useSafeBack();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  // C方案 §4.1/§4.5 - suggestOpen 控制面板显隐（失焦收起），debounce 300ms 防抖
  const [suggestOpen, setSuggestOpen] = useState(true);
  const debouncedQuery = useDebounce(query, 300);
  const showSuggest = suggestOpen && query.trim().length >= 2;
  // Why: P7 I7 - Filter Tags 改 useCategories() 动态分类，首项 "All"（t('common.all')）
  const { data: categories } = useCategories();
  const filterTags = [t('common.all'), ...(categories?.map((c) => c.name) ?? [])];
  const [activeTag, setActiveTag] = useState(t('common.all'));
  // Why: P7 F1 - Recent Searches AsyncStorage 持久化（useRecentSearches hook，最多 10 条去重最新在前）
  const { recentSearches, addRecent, removeRecent, clearRecent } = useRecentSearches();
  // Why: P7 §2.4 - Recommended 加购（MasonryProductCard onAddToCart，同 home.tsx 模式）
  const addToCartMutation = useAddToCart();
  // P8 复刻 results 顶部：购物车角标接真实数量（白底红字，同 results）
  const { data: cart } = useCart();
  const cartCount = cart?.totalItems ?? 0;
  // Why: 用真实商品替换 mock rec-* id，避免 router.push('/product/rec-1') 跳转后 404
  const { data: realProducts } = useProducts();
  // Why: P7 §2.4 R3 - 取全部（原 slice(0,4) 只 4 条不够瀑布流错落）
  const recommendList = realProducts ?? [];
  // Why: P7 §2.4 R2 - 两列瀑布流分发（奇偶分列），同 home.tsx masonry 模式
  const masonryCol1 = recommendList.filter((_, i) => i % 2 === 0);
  const masonryCol2 = recommendList.filter((_, i) => i % 2 === 1);
  // Why: P3 - 热搜榜接后端 GET /client/search/hot（real 数据，rank=idx+1，heat=searchCount）
  //   后端已按 searchCount 降序返（PINNED 前置 + BLOCKED 剔除 + MANUAL 兜底），前端不再派生
  const { data: hotList } = useSearchHot();
  const popularWithHeat = (hotList ?? []).map((item) => ({
    id: item.word,
    label: item.word,
    heat: item.searchCount >= 1000 ? `${(item.searchCount / 1000).toFixed(1)}k` : `${item.searchCount}`,
  }));
  // C方案 §4.2 - 联想双 hook 并行（接 debouncedQuery，非 raw query；showSuggest 控制 enabled）
  const { data: suggestWords, isLoading: isWordsLoading } = useSearchSuggest(debouncedQuery, showSuggest);
  const { data: suggestProducts, isLoading: isProductsLoading } = useSearchProductsSuggest(
    debouncedQuery,
    showSuggest,
  );
  // Why: 两都 loading 且无 keepPreviousData 才显加载态（方案 §4.5）
  // Why: 长度先解构到独立变量——v5 UseQueryResult 的 data 与 isLoading 是 discriminated 字段，
  //   在 `isWordsLoading && suggestWords?.length` 链中 tsc 会把 data narrow 到 undefined→never，
  //   先取 length 到 const number 再进 && 链可避开 correlated narrowing
  const wordsLen = suggestWords?.length ?? 0;
  const productsLen = suggestProducts?.length ?? 0;
  const isSuggestLoading = isWordsLoading && isProductsLoading && wordsLen === 0 && productsLen === 0;
  // C方案 §7.4 - 空态 fallback 复用 hotList（slice 3 作 chips 补位）
  const hotFallback = (hotList ?? [])
    .slice(0, 3)
    .map((item) => ({ word: item.word, searchCount: item.searchCount }));
  // Why: P7 决策 3-B - 热搜榜排名配色（1 红 / 2 中红 / 3 金 / 4+ 灰，对齐 HTML 原型 .hot-num.n1-n5）
  const rankColors = [
    { bg: colors.primary, fg: ON_PRIMARY },
    { bg: colors['primary-container'], fg: ON_PRIMARY },
    { bg: colors.cultural.amber, fg: ON_AMBER },
    { bg: colors['secondary-container'], fg: colors['on-secondary-container'] },
  ];
  const getRankColor = (rank: number) => rankColors[Math.min(rank - 1, rankColors.length - 1)];

  const onSubmitSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      // C方案 §7.5 - 空 query 提交：收起面板 + Toast 提示（不静默失败）
      setSuggestOpen(false);
      toast.info(t('search.emptyKeyword'));
      return;
    }
    // Why: P7 F1 - 搜索提交时记录到 Recent（AsyncStorage 持久化）
    addRecent(trimmed);
    router.push({ pathname: '/search/results', params: { q: trimmed } });
  };

  // Why: P7 §2.4 - Recommended 加购（同 home.tsx handleBuyAgainAddToCart）
  const handleAddToCart = (item: Product) => {
    addToCartMutation.mutate(
      { product: item, quantity: 1 },
      {
        onSuccess: () => toast.success(t('product.addedToCart', { defaultValue: 'Added to cart' })),
        onError: () => toast.error(t('product.addToCartFailed', { defaultValue: 'Add to cart failed' })),
      },
    );
  };

  return (
    <SafeAreaWrapper edges={['top']} style={{ backgroundColor: colors.primary, flex: 1 }}>
      <StatusBarConfig />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Primary Header — 176px + uma-lulik-curve 锯齿底边 */}
        <View style={styles.headerWrap}>
          {/* 底色块（被锯齿底边裁掉下半部分形成 zigzag） */}
          <View style={[styles.headerBg, { backgroundColor: colors.primary }]}>
            <View style={styles.headerPattern} pointerEvents="none">
              <TaisPattern width={390} height={90} opacity={0.2} />
            </View>
          </View>
          {/* 锯齿底边覆盖（让 header 下方背景透出锯齿形状） */}
          <View style={styles.curveLayer} pointerEvents="none">
            <UmaLulikCurve color={colors.primary} />
          </View>
          <View style={styles.headerContent}>
            {/* Why: P7 用户要求 - 同其他页面顶部样式：arrow + SearchBar + 右图标同行（去标题） */}
            <View style={styles.toolbar}>
              <Pressable
                onPress={handleBack}
                hitSlop={8}
                style={styles.toolbarBtn}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Icon symbol="arrow_back" size={24} color={ON_PRIMARY} />
              </Pressable>
              <View style={styles.searchBarInline}>
                <SearchBar
                  value={query}
                  onChange={(q) => {
                    setQuery(q);
                    // C方案 §4.5 - 输入时重新打开面板（onBlur 延迟收起后重新输入需重开）
                    setSuggestOpen(true);
                  }}
                  onBlur={() => {
                    // C方案 §4.5 - 失焦延迟 200ms 收起（让 SuggestPanel 项 onPress 先触发跳转，
                    //   避免 onBlur 同步卸载面板导致 onPress 丢失；RN 无 click-outside 时序兜底）
                    setTimeout(() => setSuggestOpen(false), 200);
                  }}
                  autoFocus
                  variant="card"
                  showMic
                  placeholder={t('common.search')}
                  onSubmit={onSubmitSearch}
                />
              </View>
              <View style={styles.toolbarRight}>
                {/* P8 复刻 results 顶部：删客服，只留购物车 + 白底红字角标 */}
                <Pressable
                  onPress={() => router.push('/cart')}
                  hitSlop={8}
                  style={styles.toolbarBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('cart.a11y.itemCount', { count: cartCount })}
                >
                  <Icon symbol="shopping_cart" size={24} color={ON_PRIMARY} />
                  {cartCount > 0 && (
                    <View
                      style={[
                        styles.cartBadge,
                        { backgroundColor: '#ffffff', borderColor: colors.primary },
                      ]}
                    >
                      <Text style={[styles.cartBadgeText, { color: colors.primary }]}>
                        {cartCount > 99 ? '99+' : cartCount}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Filter Tags 横滑 - C方案 §4.6: showSuggest 时隐藏（联想面板独占） */}
        {!showSuggest && (
        <View style={styles.filterTagsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterTagsRow}>
              {filterTags.map((tag) => {
                const active = tag === activeTag;
                return (
                  <Pressable
                    key={tag}
                    onPress={() => setActiveTag(tag)}
                    style={[
                      styles.filterTag,
                      active
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : {
                            // Why: C1 胶囊化 - surface-container-high 底 + transparent 描边（无 rgba）
                            backgroundColor: colors['surface-container-high'],
                            borderColor: 'transparent',
                          },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter: ${tag}`}
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[styles.filterTagText, { color: active ? ON_PRIMARY : colors.primary }]}
                    >
                      {tag}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
        )}

        {/* Recent Searches（P7 F1: AsyncStorage 持久化 + 流式 chip，空时隐藏整块） */}
        {(!showSuggest && recentSearches.length > 0) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
              {t('search.recent')}
            </Text>
            <Pressable
              onPress={clearRecent}
              accessibilityRole="button"
              accessibilityLabel={t('search.clearAll')}
            >
              <Text style={[styles.clearAllText, { color: colors.primary }]}>{t('search.clearAll')}</Text>
            </Pressable>
          </View>
          <View style={styles.recentChips}>
            {recentSearches.map((item) => (
              // Why: Web 端 Pressable 渲染 <button>，HTML 禁止 button 嵌套 button（hydration error）。
              //   改平级 Pressable（文字点击搜索 + close 点击删除），外层 View 容器不点击
              <View key={item} style={styles.recentChip}>
                <Pressable
                  onPress={() => onSubmitSearch(item)}
                  style={({ pressed }) => [styles.recentChipTextWrap, pressed && styles.chipPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={t('search.searchTerm', { term: item })}
                >
                  <Text
                    style={[styles.recentChipText, { color: colors['on-surface-variant'] }]}
                    numberOfLines={1}
                  >
                    {item}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => removeRecent(item)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item}`}
                >
                  {/* 原因：on-sv 暖灰 close 图标，dark 不变（方案 §2.3 F1 流式 chip） */}
                  <Icon symbol="close" size={12} color={colors['on-surface-variant']} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
        )}

        {/* Popular Searches 热搜榜（P7 决策 3-B）- 空数据时隐藏整块（跟 Recent 区一致） */}
        {(!showSuggest && popularWithHeat.length > 0) && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
            {t('search.popular')}
          </Text>
          <View style={styles.hotList}>
            {popularWithHeat.map((item, idx) => {
              const rank = idx + 1;
              const label = item.label;
              const rankColor = getRankColor(rank);
              return (
              <Pressable
                key={item.id}
                onPress={() => onSubmitSearch(label)}
                style={({ pressed }) => [
                  styles.hotRank,
                  { backgroundColor: colors['surface-container-low'] },
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('search.searchTerm', { term: label })}
              >
                <View style={[styles.hotNum, { backgroundColor: rankColor.bg }]}>
                  <Text style={[styles.hotNumText, { color: rankColor.fg }]}>{rank}</Text>
                </View>
                <Text
                  style={[styles.hotWord, { color: colors['on-surface'] }]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
                <View style={[styles.hotTag, { backgroundColor: colors['surface-container-high'] }]}>
                  <Icon symbol="trending_up" size={10} color={colors.primary} />
                  <Text style={[styles.hotTagText, { color: colors.primary }]}>{item.heat}</Text>
                </View>
              </Pressable>
              );
            })}
          </View>
        </View>
        )}

        {/* Recommended for You（P7 §2.4: MasonryProductCard 两列瀑布流，与首页统一）- C方案 §4.6: showSuggest 时隐藏 */}
        {!showSuggest && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
            {t('search.recommended')}
          </Text>
          {recommendList.length > 0 && (
            <View style={styles.masonryRow}>
              <View style={styles.masonryCol}>
                {masonryCol1.map((product) => (
                  <MasonryProductCard
                    key={product.id}
                    product={product}
                    badge={resolveBadges(product, t)[0]}
                    onPress={() => router.push(`/product/${product.id}`)}
                    onAddToCart={() => handleAddToCart(product)}
                  />
                ))}
              </View>
              <View style={styles.masonryCol}>
                {masonryCol2.map((product) => (
                  <MasonryProductCard
                    key={product.id}
                    product={product}
                    badge={resolveBadges(product, t)[0]}
                    onPress={() => router.push(`/product/${product.id}`)}
                    onAddToCart={() => handleAddToCart(product)}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
        )}
      </ScrollView>
      {/* C方案 §4.4 - SuggestPanel 挂 ScrollView 同级 absolute（top:90=headerWrap 高度），不随滚动 */}
      {showSuggest && (
        <View style={styles.suggestWrap} pointerEvents="box-none">
          <SuggestPanel
            words={suggestWords ?? []}
            products={suggestProducts ?? []}
            query={query}
            isLoading={isSuggestLoading}
            hotFallback={hotFallback}
            onWordPress={(w) => onSubmitSearch(w)}
            onProductPress={(p) => router.push(`/product/${p.id}`)}
            onHotFallbackPress={(w) => onSubmitSearch(w)}
          />
        </View>
      )}
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xxl * 2,
  },
  headerWrap: {
    position: 'relative',
    height: 90,
    overflow: 'hidden',
  },
  headerBg: {
    // Why: 改 relative（原 absolute）-- TaisPattern 的 absolute container 在 absolute parent 内 right:0 解析异常（左半边塌缩）。
    //   对齐 PrimaryHeader 的 relative header，让 TaisPattern 全宽撑满
    position: 'relative',
    height: 90,
    overflow: 'hidden',
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  curveLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerContent: {
    // Why: 改 absoluteFill（原 flex 1）-- headerBg relative 占满 headerWrap 后 flex 1 无空间，改 absolute 覆盖上层
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: layout['container-margin'],
    // Why: toolbar 垂直居中（替代 paddingTop，避免内容偏上）
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    // Why: P7 - arrow + SearchBar(flex:1) + 右图标同行（去标题，同 PrimaryHeader 风格）
    gap: spacing.sm,
    height: 56,
  },
  // Why: SearchBar 占满中间（arrow 与右图标之间）
  searchBarInline: {
    flex: 1,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toolbarBtn: {
    position: 'relative',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // P8 复刻 results：购物车角标（白底红字红边，backgroundColor/color 动态内联）
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  filterTagsWrap: {
    paddingTop: spacing.lg,
  },
  filterTagsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: layout['container-margin'],
  },
  filterTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterTagText: {
    ...typography['label-caps'],
    fontSize: 12,
  },
  section: {
    paddingHorizontal: layout['container-margin'],
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.h3,
    fontWeight: '600',
  },
  clearAllText: {
    ...typography['label-caps'],
    fontSize: 12,
    letterSpacing: 0.5,
  },
  // Why: P7 F1 - Recent 流式 chip（flex-wrap 自动换行，无背景无边框，纯文字 on-sv + close 12px）
  recentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  // Why: 文字 Pressable（点击搜索），Web 端渲染 <button> 不可嵌套，故与 close 平级
  recentChipTextWrap: {
    paddingVertical: 2,
  },
  // Why: 流式 chip 按压 scale(.92) 触觉反馈（对齐原型 .recent-chip:active）
  chipPressed: { transform: [{ scale: 0.92 }] },
  recentChipText: {
    ...typography['body-sm'],
    fontWeight: '500',
    fontSize: 13,
  },
  // Why: P7 决策 3-B - 热搜榜样式（每行 rank + word + heat tag，对齐 HTML 原型 .hot-rank/.hot-num/.hot-tag）
  hotList: {
    gap: spacing.sm,
  },
  hotRank: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  hotNum: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotNumText: {
    fontSize: 11,
    fontWeight: '800',
  },
  hotWord: {
    ...typography['body-sm'],
    fontWeight: '600',
    fontSize: 13,
    flex: 1,
  },
  hotTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hotTagText: {
    fontSize: 9,
    fontWeight: '600',
  },
  // Why: P7 §2.4 R2 - 两列瀑布流（同 home.tsx masonryRow/masonryCol）
  masonryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  masonryCol: {
    flex: 1,
    gap: spacing.md,
  },
  // C方案 §4.4 - SuggestPanel 定位锚点：ScrollView 同级 absolute，top:90=headerWrap 高度
  suggestWrap: {
    position: 'absolute',
    top: 90,
    left: layout['container-margin'],
    right: layout['container-margin'],
    zIndex: 10,
  },
});
