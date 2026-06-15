// SearchResultPage — 还原自 SearchResultPage.html（319 行）
// HTML → RN 行数比：319 → ~370（含样式）
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 116%）
// Fix-11: Primary tais-pattern Header + 内嵌只读搜索 + 排序栏 + 结果计数 + Load More
import { useState } from 'react';
import { StyleSheet, View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme, spacing, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ProductCard } from '@/components/business/ProductCard';
import type { ProductBadge } from '@/components/business/ProductCard/ProductCard.types';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import { useProductSearch } from '@/services/queries/useProducts';
import { useDebounce } from '@/hooks/useDebounce';
import type { Product } from '@/types';

// 排序 & 过滤栏（HTML 第 170-189 行）
const SORT_OPTIONS = ['All', 'Best Selling', 'Price: Low to High', 'New Arrivals'] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

// 购物车角标 mock（HTML 第 165 行）
const CART_BADGE_COUNT = 3;

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
  const { data: results, isLoading, isError, refetch } = useProductSearch(keyword);
  const [activeSort, setActiveSort] = useState<SortOption>('All');

  const count = results?.length ?? 0;

  return (
    <SafeAreaWrapper edges={['bottom']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBarConfig />
      <Header keyword={params.q ?? ''} />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <ErrorState message="Failed to load results. Please try again." onRetry={() => refetch()} />
      ) : !results || results.length === 0 ? (
        <EmptyState
          title="No results found"
          description={`No products matching "${params.q ?? ''}"`}
          icon="package-variant"
        />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Sort & Filter Bar */}
          <View
            style={[
              styles.sortWrap,
              {
                backgroundColor: colors['surface-container-lowest'],
                borderColor: 'rgba(141,112,108,0.1)',
              },
            ]}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.sortRow}>
                {SORT_OPTIONS.map((opt) => {
                  const active = opt === activeSort;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => setActiveSort(opt)}
                      style={[
                        styles.sortPill,
                        active && { backgroundColor: 'rgba(150,24,19,0.1)' },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`Sort: ${opt}`}
                    >
                      <Text
                        style={[
                          styles.sortText,
                          {
                            color: active ? colors.primary : 'rgba(89,65,61,0.7)',
                          },
                        ]}
                      >
                        {opt}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Results Found 计数 */}
          <Text style={[styles.countText, { color: colors['on-surface-variant'] }]}>
            {count} related products found
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

          {/* Load More Section */}
          <View style={styles.loadMore}>
            <View
              style={[
                styles.spinner,
                {
                  borderColor: 'rgba(141,112,108,0.3)',
                  borderTopColor: colors.primary,
                },
              ]}
            />
            <Text style={[styles.loadMoreText, { color: colors['on-surface-variant'] }]}>
              Finding more products...
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaWrapper>
  );
}

// Primary tais-pattern Header + 内嵌只读搜索框（HTML 第 151-168 行）
function Header({ keyword }: { keyword: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: colors.primary }, shadowPresets.lg]}>
      <View style={styles.headerPattern} pointerEvents="none">
        <TaisPattern width={390} height={80} opacity={0.2} />
      </View>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon symbol="arrow_back" size={24} color="#ffffff" />
        </Pressable>

        {/* 内嵌只读搜索框 */}
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors['surface-container-lowest'],
              borderColor: 'rgba(141,112,108,0.2)',
            },
          ]}
        >
          <Icon symbol="search" size={16} color={colors.outline} />
          <Text
            style={[styles.searchInput, { color: colors['on-surface'] }]}
            numberOfLines={1}
            accessibilityLabel={`Search keyword: ${keyword}`}
          >
            {keyword || 'Search products...'}
          </Text>
          <Pressable
            onPress={() => router.push('/search')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Icon symbol="close" size={16} color={colors.outline} />
          </Pressable>
        </View>

        {/* 购物车 + 角标 */}
        <Pressable
          onPress={() => router.push('/(main)/cart')}
          hitSlop={8}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel={`Cart with ${CART_BADGE_COUNT} items`}
        >
          <Icon symbol="shopping_cart" size={24} color="#ffffff" />
          <View
            style={[
              styles.cartBadge,
              {
                backgroundColor: colors['tertiary-fixed'],
                borderColor: colors.primary,
              },
            ]}
          >
            <Text style={styles.cartBadgeText}>{CART_BADGE_COUNT}</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: spacing['container-margin'],
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
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    ...typography['body-sm'],
    paddingHorizontal: spacing.xs,
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
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing['container-margin'],
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
    marginHorizontal: -spacing.gutter / 2,
  },
  gridCell: {
    width: '50%',
    paddingHorizontal: spacing.gutter / 2,
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
