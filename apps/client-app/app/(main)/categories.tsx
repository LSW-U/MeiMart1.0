// CategoryPage — 还原自 CategoryPage.html（368 行）
// HTML → RN 行数比：368 → ~470（含样式）
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 128%）
// Fix-15: Primary tais-pattern Header + 侧栏图标 + Daily Deals + 分类标题 + TaisDivider + HOT PRODUCTS + VIEW ALL + Skeleton
// 优化: 商品卡片整体可点击跳转 + 加购按钮真正加购 + 真实商品替换 mock + 商品网格 2 列 8 个
import { useState, useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, borderRadius } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { HorizontalProductCard } from '@/components/business/HorizontalProductCard/HorizontalProductCard';
import { resolveBadges } from '@/utils/resolveBadges';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCategories, useSubCategories } from '@/services/queries/useCatalog';
import { useProductsByCategory, useProducts } from '@/services/queries/useProducts';
import { useAddToCart } from '@/services/queries/useCart';
import { toast } from '@/store/toastStore';
import type { Product, Category } from '@/types';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';

// Why: 侧栏分类改用后端 useCategories() 真实数据（含图片），移除硬编码 SIDEBAR_CATEGORIES

// Why: HOT_PRODUCTS mock 已删除，改用 useProductsByCategory 获取真实商品

export default function CategoriesPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { categoryId: urlCategoryId } = useLocalSearchParams<{ categoryId?: string }>();
  const {
    data: categories,
    isLoading: catLoading,
    isError: catError,
    refetch: catRefetch,
  } = useCategories();
  // Why: activeId 优先用 URL 参数（从 home 跳转传入），否则用第一个分类
  const [activeId, setActiveId] = useState<string>(urlCategoryId ?? '');
  const {
    data: products,
    isLoading: prodLoading,
    isError: prodError,
    refetch: prodRefetch,
  } = useProductsByCategory(activeId || undefined);
  const { data: allProducts } = useProducts();
  const addToCartMutation = useAddToCart();
  // Why: P5 U4 筛选栏 - sortMode 驱动 sortedProducts（前端排序，HOT PRODUCTS 消费）
  const [sortMode, setSortMode] = useState<
    'popular' | 'discount' | 'price-asc' | 'price-desc'
  >('popular');
  const sortedProducts = useMemo(() => {
    if (!products) return [];
    const sorted = [...products];
    switch (sortMode) {
      case 'discount':
        return sorted.sort((a, b) => {
          const da =
            a.originalPrice && a.originalPrice > a.price ? a.originalPrice - a.price : 0;
          const db =
            b.originalPrice && b.originalPrice > b.price ? b.originalPrice - b.price : 0;
          return db - da;
        });
      case 'price-asc':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return sorted.sort((a, b) => b.price - a.price);
      default: // popular
        return sorted.sort((a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0));
    }
  }, [products, sortMode]);

  // Why: categories 加载后，如果 activeId 为空或无效，设为第一个分类
  const validActiveId =
    activeId && categories?.some((c) => c.id === activeId)
      ? activeId
      : categories?.[0]?.id ?? '';

  // Why: P5 U3 - 子分类 hook 驱动，后端 children 未就绪时返空数组，整块隐藏
  const subCategories = useSubCategories(validActiveId);
  // TODO(临时调试) 子分类墙可见性排查，确认后删除
  console.log(
    `[P5 sub-wall] validActiveId=${validActiveId} | subCount=${subCategories.length} | sub0Name=${subCategories[0]?.name ?? 'none'} | catCount=${categories?.length} | firstCatId=${categories?.[0]?.id} | firstCatChildren=${categories?.[0]?.children?.length}`,
  );

  // Why: "为你推荐"取所有商品的前 4 个（排除当前分类），丰富页面内容
  const recommended = (allProducts ?? [])
    .filter((p) => !products?.some((cp) => cp.id === p.id))
    .slice(0, 4);

  // Why: 加购成功提示
  const handleAddToCart = (product: Product) => {
    addToCartMutation.mutate(
      { product, quantity: 1 },
      {
        onSuccess: () => toast.success(t('product.addedToCart', { defaultValue: 'Added to cart' })),
        onError: () => toast.error(t('product.addToCartFailed', { defaultValue: 'Add to cart failed' })),
      },
    );
  };

  if (catLoading) {
    return (
      <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
        <CategoriesHeader />
        <ContentSkeleton />
      </SafeAreaWrapper>
    );
  }
  if (catError || !categories) {
    return (
      <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
        <CategoriesHeader />
        <ErrorState message={t('errors.categories')} onRetry={() => catRefetch()} />
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <CategoriesHeader />

      <View style={styles.body}>
        {/* 侧栏 */}
        <View style={[styles.sidebar, { backgroundColor: colors['surface-container-low'], borderRightColor: colors['outline-variant'] }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {categories.map((cat) => (
              <SidebarItem
                key={cat.id}
                category={cat}
                active={cat.id === validActiveId}
                onPress={() => setActiveId(cat.id)}
              />
            ))}
          </ScrollView>
        </View>

        {/* 内容区 */}
        <View style={styles.contentWrap}>
          {prodLoading ? (
            <ContentSkeleton />
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.contentInner}
              showsVerticalScrollIndicator={false}
            >
              {/* 子分类圆形图标（hook 驱动，无数据隐藏） */}
              {subCategories.length > 0 && (
                <View
                  style={[
                    styles.subGrid,
                    { borderWidth: 2, borderColor: 'red', padding: 8 }, // TODO(临时调试) 红框确认位置，删除
                  ]}
                >
                  <Text style={{ color: 'red', fontSize: 10 }}>DEBUG 子分类墙 subCount={subCategories.length}</Text>
                  {subCategories.map((sub) => (
                    <Pressable
                      key={sub.id}
                      onPress={() => router.push('/search')}
                      style={styles.subItem}
                      accessibilityRole="button"
                      accessibilityLabel={sub.name}
                    >
                      <View
                        style={[
                          styles.subIcon,
                          {
                            backgroundColor: colors['surface-container-high'],
                            borderColor: colors['outline-variant'],
                          },
                        ]}
                      >
                        <SafeImage source={{ uri: sub.image ?? '' }} style={styles.subImage} />
                      </View>
                      <Text
                        style={[styles.subLabel, { color: colors['on-surface'] }]}
                        numberOfLines={1}
                      >
                        {sub.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* P5 U4 筛选栏 - 右对齐纯文字，3 chip（Popular/Discount/Price↕） */}
              <View style={styles.filterBar}>
                <Pressable
                  onPress={() => setSortMode('popular')}
                  style={styles.filterChip}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={t('category.sortPopular')}
                >
                  <Text
                    style={[
                      styles.filterText,
                      {
                        color:
                          sortMode === 'popular'
                            ? colors.primary
                            : colors['on-surface-variant'],
                      },
                    ]}
                  >
                    {t('category.sortPopular')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setSortMode('discount')}
                  style={styles.filterChip}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={t('category.sortDiscount')}
                >
                  <Text
                    style={[
                      styles.filterText,
                      {
                        color:
                          sortMode === 'discount'
                            ? colors.primary
                            : colors['on-surface-variant'],
                      },
                    ]}
                  >
                    {t('category.sortDiscount')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setSortMode(sortMode === 'price-asc' ? 'price-desc' : 'price-asc')
                  }
                  style={[styles.filterChip, styles.filterPrice]}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={t('category.sortPrice')}
                >
                  <Text
                    style={[
                      styles.filterText,
                      {
                        color:
                          sortMode === 'price-asc' || sortMode === 'price-desc'
                            ? colors.primary
                            : colors['on-surface-variant'],
                      },
                    ]}
                  >
                    {t('category.sortPrice')}
                  </Text>
                  <Icon
                    symbol="swap_vert"
                    size={16}
                    color={
                      sortMode === 'price-asc' || sortMode === 'price-desc'
                        ? colors.primary
                        : colors['on-surface-variant']
                    }
                  />
                </Pressable>
              </View>

              {/* HOT PRODUCTS */}
              <View style={styles.hotHeader}>
                <Text style={[styles.hotTitle, { color: colors['on-surface-variant'] }]}>
                  {t('category.hotProducts')}
                </Text>
                <View style={[styles.hotLine, { backgroundColor: colors['outline-variant'] }]} />
              </View>

              {prodError ? (
                <ErrorState message={t('errors.products')} onRetry={() => prodRefetch()} />
              ) : !products || products.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={[styles.emptyText, { color: colors['on-surface-variant'] }]}>
                    {t('common.empty')}
                  </Text>
                </View>
              ) : (
                <View style={styles.hotListColumn}>
                  {/* §9-2 横向化 - 竖版双列 → 纵向列表 HorizontalProductCard */}
                  {sortedProducts.slice(0, 8).map((p) => (
                    <HorizontalProductCard
                      key={p.id}
                      product={p}
                      onPress={() => router.push(`/product/${p.id}`)}
                      onAddToCart={() => handleAddToCart(p)}
                      badge={resolveBadges(p, t)[0]}
                      showRating
                    />
                  ))}
                </View>
              )}

              {/* 为你推荐 */}
              {recommended.length > 0 && (
                <>
                  <View style={[styles.hotHeader, { marginTop: spacing.lg }]}>
                    <Text style={[styles.hotTitle, { color: colors['on-surface-variant'] }]}>
                      {t('category.recommendForYou', { defaultValue: 'Recommended For You' })}
                    </Text>
                    <View style={[styles.hotLine, { backgroundColor: colors['outline-variant'] }]} />
                  </View>
                  <View style={styles.hotListColumn}>
                    {recommended.map((p) => (
                      <HorizontalProductCard
                        key={p.id}
                        product={p}
                        onPress={() => router.push(`/product/${p.id}`)}
                        onAddToCart={() => handleAddToCart(p)}
                        showRating
                      />
                    ))}
                  </View>
                </>
              )}

              {/* VIEW ALL PRODUCTS 按钮 */}
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/product/list', params: { category: activeId } })
                }
                style={({ pressed }) => [
                  styles.viewAllBtn,
                  { borderColor: colors.primary },
                  pressed && { backgroundColor: colors.primary + '0D' /* 原因：pressed 5% tint（8位 hex '0D'≈5%）*/ },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('category.viewAllProductsA11y')}
              >
                <Text style={[styles.viewAllText, { color: colors.primary }]}>
                  {t('category.viewAllProducts')}
                </Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </SafeAreaWrapper>
  );
}

// Why: 侧栏单项 - 图片渲染 + onError fallback 到 tag 图标
function SidebarItem({
  category,
  active,
  onPress,
}: {
  category: Category;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const [imageError, setImageError] = useState(false);
  const hasImage = Boolean(category.image) && !imageError;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.sidebarItem,
        active && {
          backgroundColor: colors.primary + '1F' /* 原因：active 12% tint 背景 */,
          borderLeftColor: colors.primary,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={category.name}
    >
      {hasImage ? (
        <Image
          source={{ uri: category.image }}
          style={styles.sidebarImage}
          onError={() => setImageError(true)}
          accessible={false}
        />
      ) : (
        <MaterialCommunityIcons
          name="tag"
          size={22}
          color={active ? colors.primary : colors['on-surface-variant']}
        />
      )}
      <Text
        style={[
          styles.sidebarLabel,
          {
            color: active ? colors.primary : colors['on-surface-variant'],
          },
        ]}
        numberOfLines={1}
      >
        {category.name}
      </Text>
    </Pressable>
  );
}

// Primary tais-pattern Header（HTML 第 141-153 行）
function CategoriesHeader() {
  const { t } = useTranslation();
  return (
    <PrimaryHeader
      title={t('tabs.categories')}
      showLocation
      locationLabel={t('home.locationLabel')}
      onLocationPress={() => router.push('/address/map')}
      rightActions={
        <Pressable
          onPress={() => router.push('/search')}
          hitSlop={8}
          style={headerActionStyles.btn}
          accessibilityRole="button"
          accessibilityLabel={t('common.search')}
        >
          <Icon symbol="search" size={24} color="#ffffff" />
        </Pressable>
      }
    />
  );
}

const headerActionStyles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Skeleton 加载状态（HTML 第 188-218 行）
function ContentSkeleton() {
  return (
    <View style={{ flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.lg }}>
      {/* Sub-category circles */}
      <View style={styles.skelSubGrid}>
        {[0, 1].map((i) => (
          <View key={i} style={styles.skelSubItem}>
            <Skeleton width={80} height={80} variant="circle" />
            <View style={{ marginTop: spacing.sm }}>
              <Skeleton width={64} height={12} />
            </View>
          </View>
        ))}
      </View>
      {/* Hot products skeleton */}
      <View style={{ marginTop: spacing.xl }}>
        <View style={styles.skelHotGrid}>
          {[0, 1].map((i) => (
            <View key={i} style={styles.skelHotCard}>
              <Skeleton width="100%" height={120} radius={borderRadius.lg} />
              <View style={{ marginTop: spacing.xs }}>
                <Skeleton width="80%" height={14} />
              </View>
              <View style={{ marginTop: spacing.xs }}>
                <Skeleton width={50} height={20} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: '25%',
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  sidebarItem: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
  },
  // Why: 侧栏分类图片 - 圆形，选中时加边框高亮
  sidebarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: 'cover',
  },
  sidebarLabel: {
    ...typography['label-caps'],
    fontSize: 10,
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  contentWrap: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  subGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  subItem: {
    alignItems: 'center',
    width: 80,
    gap: spacing.sm,
  },
  subIcon: {
    width: 80,
    height: 80,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  subImage: {
    width: 56,
    height: 56,
    borderRadius: 999,
    resizeMode: 'contain',
  },
  subLabel: {
    ...typography['label-caps'],
    textAlign: 'center',
  },
  // P5 U4 筛选栏 - 右对齐纯文字（无按钮形态），3 chip
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginVertical: spacing.md,
  },
  filterChip: {},
  filterPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  filterText: {
    ...typography['label-caps'],
    fontSize: 12,
  },
  hotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  hotTitle: {
    ...typography['label-caps'],
  },
  hotLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  // Why: §9-2 横向化 - 纵向列表
  hotListColumn: {
    gap: spacing.md,
  },
  emptyWrap: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography['body-md'],
  },
  viewAllBtn: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  viewAllText: {
    ...typography['label-caps'],
    fontWeight: '700',
  },
  // Skeleton styles
  skelSubGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  skelSubItem: {
    alignItems: 'center',
  },
  skelHotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.md / 2,
  },
  skelHotCard: {
    width: '50%',
    paddingHorizontal: spacing.md / 2,
    marginBottom: spacing.md,
    gap: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
