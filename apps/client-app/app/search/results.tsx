// SearchResultPage — 还原自 SearchResultPage.html（319 行）
// HTML → RN 行数比：319 → ~370（含样式）
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 116%）
// Fix-11: Primary tais-pattern Header + 内嵌只读搜索 + 排序栏 + 结果计数 + Load More
import { useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, type NativeScrollEvent } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ProductCard } from '@/components/business/ProductCard';
import type { ProductBadge } from '@/components/business/ProductCard/ProductCard.types';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
// P8-6 R3/R5：Recommended 复用 MasonryProductCard + resolveBadges（与首页/P7 统一）
import { MasonryProductCard } from '@/components/business/MasonryProductCard/MasonryProductCard';
import { SearchBar } from '@/components/business/SearchBar';
import { resolveBadges } from '@/utils/resolveBadges';
import { toast } from '@/store/toastStore';
import { useProductSearch, useProducts, type ProductSortKey } from '@/services/queries/useProducts';
import { useCart, useAddToCart } from '@/services/queries/useCart';
import { useDebounce } from '@/hooks/useDebounce';
import type { Product } from '@/types';

// P8-2 i18n：排序 value(labelKey) 分离。key 传后端 sortBy，labelKey 走 t()。
// all 复用 common.all，不新增 search.sort.all（避免重复 key）。
// P8-5: ProductSortKey 从 service 导入（与后端 ProductSortBy 一致），不本地重定义
const SORT_OPTIONS: { key: ProductSortKey; labelKey: string }[] = [
  { key: 'all', labelKey: 'common.all' },
  { key: 'bestSelling', labelKey: 'search.sort.bestSelling' },
  { key: 'priceAsc', labelKey: 'search.sort.priceAsc' },
  { key: 'newArrivals', labelKey: 'search.sort.newArrivals' },
];

// 4 个商品角标轮转：FRESH / TOP RATED / 无 / NEW（HTML 第 199 / 215 / 230 / 246 行）
function getResultBadge(idx: number): ProductBadge | undefined {
  if (idx === 0) return { label: 'Fresh', variant: 'fresh' };
  if (idx === 1) return { label: 'Top Rated', variant: 'top-rated' };
  if (idx === 3) return { label: 'New', variant: 'new' };
  return undefined;
}

export default function SearchResultsPage() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ q: string }>();
  const keyword = useDebounce(params.q ?? '', 300);
  const { t } = useTranslation();
  const [activeSort, setActiveSort] = useState<ProductSortKey>('all');
  // P8-5 F2+F3：sortBy 变重查第一页（决策 2-B），onEndReached 触发 fetchNextPage（决策 3-B）
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProductSearch(keyword, activeSort);
  // Why: pages.flatMap 拼接所有已加载页；total 取首页（搜索结果总数，非累计已加载数）
  const results = data?.pages.flatMap((p) => p.items) ?? [];
  const count = data?.pages[0]?.total ?? 0;

  // P8-5 F3：ScrollView 触底加载下一页（distanceFromBottom < 200）
  const handleScroll = ({ nativeEvent }: { nativeEvent: NativeScrollEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const distanceFromBottom =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    if (distanceFromBottom < 200 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // P8-6 R1：Recommended 数据源 useProducts（与 P7/home 一致），去重过渡期可接受（方案 §2.4）
  const { data: realProducts } = useProducts();
  const recommendList = realProducts ?? [];
  const masonryCol1 = recommendList.filter((_, i) => i % 2 === 0);
  const masonryCol2 = recommendList.filter((_, i) => i % 2 === 1);
  const addToCartMutation = useAddToCart();
  const handleAddToCart = (item: Product) => {
    addToCartMutation.mutate(
      { product: item, quantity: 1 },
      {
        onSuccess: () =>
          toast.success(t('product.addedToCart', { defaultValue: 'Added to cart' })),
        onError: () =>
          toast.error(t('product.addToCartFailed', { defaultValue: 'Add to cart failed' })),
      },
    );
  };

  // P8-7: 顶部搜索框可编辑（同 P7 SearchBar + 麦克风）
  // Why: Header 用 key={params.q} 重挂载同步搜索词，避免 effect setState（react-hooks 规则）
  const handleSubmitSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    // Why: setParams 刷新当前页（useProductSearch 自动重查），避免 push 堆路由栈
    router.setParams({ q: trimmed });
  };

  // P8-6: Recommended 渲染抽函数（结果分支 !hasNextPage + empty 分支共用）
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
      </View>
    ) : null;

  return (
    <SafeAreaWrapper edges={['bottom']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBarConfig />
      <Header key={params.q} initialKeyword={params.q ?? ''} onSubmitSearch={handleSubmitSearch} />

      {isLoading ? (
        // P8-3 F1 骨架屏：4 卡片占位（图片+名+价），替代 spinner，视觉延续性好
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.sortWrap, { borderColor: colors['outline-variant'] }]}>
            <Skeleton width={80} height={32} radius={8} />
            <Skeleton width={60} height={32} radius={8} />
          </View>
          <View style={styles.grid}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.gridCell}>
                <View style={styles.skeletonCard}>
                  <Skeleton width="100%" height={140} radius={8} />
                  <Skeleton width="80%" height={14} variant="text" />
                  <Skeleton width="50%" height={16} variant="text" />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
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
          {renderRecommended()}
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
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
                      onPress={() => setActiveSort(opt.key)}
                      style={[
                        styles.sortPill,
                        active && { backgroundColor: colors['surface-container-high'] },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`Sort: ${label}`}
                    >
                      <Text
                        style={[
                          styles.sortText,
                          {
                            color: active ? colors.primary : colors['on-surface-variant'],
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

          {/* Results Found 计数 */}
          <Text style={[styles.countText, { color: colors['on-surface-variant'] }]}>
            {t('search.resultCount', { count })}
          </Text>

          {/* Product Grid 2 列 */}
          <View style={styles.grid}>
            {results.map((item: Product, idx: number) => (
              <View key={item.id} style={styles.gridCell}>
                <ProductCard
                  product={item}
                  badge={getResultBadge(idx)}
                  onPress={() => router.push(`/product/${item.id}`)}
                />
              </View>
            ))}
          </View>

          {/* P8-5 F3 真实分页：hasNextPage 时显示 Load More + 触底加载，无更多隐藏（替假 spinner） */}
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
        </ScrollView>
      )}
    </SafeAreaWrapper>
  );
}

// Primary tais-pattern Header + 可编辑搜索框（P8-7 改 SearchBar，同 P7）
function Header({
  initialKeyword,
  onSubmitSearch,
}: {
  initialKeyword: string;
  onSubmitSearch: (q: string) => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const handleBack = useSafeBack();
  const [query, setQuery] = useState(initialKeyword);
  // P8-4 F4：购物车角标接真实数量（cart.totalItems），未登录/空购物车隐藏角标
  const { data: cart } = useCart();
  const cartCount = cart?.totalItems ?? 0;
  return (
    <View style={[styles.header, { backgroundColor: colors.primary }, shadowPresets.lg]}>
      <View style={styles.headerPattern} pointerEvents="none">
        <TaisPattern width={390} height={80} opacity={0.2} />
      </View>
      <View style={styles.headerRow}>
        <Pressable
          onPress={handleBack}
          hitSlop={8}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon symbol="arrow_back" size={24} color="#ffffff" />
        </Pressable>

        {/* P8-7: 可编辑搜索框（SearchBar + 麦克风，同 P7），提交触发 setParams 刷新当前页 */}
        <View style={styles.searchBarInline}>
          <SearchBar
            value={query}
            onChange={setQuery}
            onSubmit={onSubmitSearch}
            variant="card"
            showMic
            placeholder={t('search.placeholder')}
          />
        </View>

        {/* 购物车 + 角标 */}
        <Pressable
          onPress={() => router.push('/cart')}
          hitSlop={8}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel={t('cart.a11y.itemCount', { count: cartCount })}
        >
          <Icon symbol="shopping_cart" size={24} color="#ffffff" />
          {cartCount > 0 && (
            <View
              style={[
                styles.cartBadge,
                {
                  // Why: 白底红字红边（用户要求），底固定白不随主题，字/边用 primary 红
                  backgroundColor: '#ffffff',
                  borderColor: colors.primary,
                },
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
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: layout['container-margin'],
    paddingVertical: spacing.sm,
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
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  scrollContent: {
    padding: layout['container-margin'],
    paddingBottom: spacing.xxl * 2,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -layout.gutter / 2,
  },
  gridCell: {
    width: '50%',
    paddingHorizontal: layout.gutter / 2,
    marginBottom: spacing.lg,
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
  skeletonCard: {
    gap: spacing.sm,
  },
  // P8-6 R4：Recommended 两列瀑布流（同 home.tsx / P7 search/index masonry 模式）
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
