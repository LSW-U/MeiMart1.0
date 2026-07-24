// CategoryPage — 还原自 CategoryPage.html（368 行）
// HTML → RN 行数比：368 → ~470（含样式）
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 128%）
// Fix-15: Primary tais-pattern Header + 侧栏图标 + Daily Deals + 分类标题 + TaisDivider + HOT PRODUCTS + VIEW ALL + Skeleton
// 优化: 商品卡片整体可点击跳转 + 加购按钮真正加购 + 真实商品替换 mock + 商品网格 2 列 8 个
import { useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, borderRadius } from '@/theme';
import { useLocalizer } from '@/i18n';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { TaisDivider } from '@/components/cultural/TaisDivider';
import { Icon } from '@/components/ui/Icon';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCategories } from '@/services/queries/useCatalog';
import { useProductsByCategory, useProducts } from '@/services/queries/useProducts';
import { useAddToCart } from '@/services/queries/useCart';
import { toast } from '@/store/toastStore';
import type { Product, Category } from '@/types';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';

// Why: 侧栏分类改用后端 useCategories() 真实数据（含图片），移除硬编码 SIDEBAR_CATEGORIES

// 子分类（圆形图标 + 文字）（HTML 第 244-256 行）
const SUB_CATEGORIES = [
  {
    id: 'fresh-produce',
    labelKey: 'category.freshProduce',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCJ0mwdZ91JDNcZtgNG8LJuMuPzyGWgEgHF4amLQGyleEaAM2_vN9e8_yls81vcJGObZjolSY46cXtxg98jkaCCa_wYo02uTJ0adxQ4hNa6sKR7DErGKW2_hsOKcpgaRadH6Wdi_ez1vl8UgO8tf3wvaRR6hspIg7UoDHuatdMxH4vg_i4l1eOUgZT0Sbk1rHN0VxWk5owwBS57Fw1a8KARRMaDR1dy4S9OtMZ0Q2wAC3zKlZz1-v-koYDCq3nDIiwQLDYmWArl',
  },
  {
    id: 'local-snacks',
    labelKey: 'category.localSnacks',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCn4WB3SlllgqEzE_KkwUjxrwtlMifp6Oxlya4BBGGF2ZQfddW-OMGFSI6mnkOMgplrcsTJNSokWowv0LL19-2nW4vBrHvzirlIzck5i24evPL0U4i-lPJbb0jTKgToz4yV8qwqSpRkKxUvVTOrwRTDJk7bbir9BUqn0drMJgdCCe-zYuLrqSMMOcCRvNXpFKwEpWMn1xU_K9dCRRLd-zI-hTP0BE6MPtmk63q-ROOFzRRkjKF0FzRzNFjAwfRON_Ib39xutCmA',
  },
];

// Why: HOT_PRODUCTS mock 已删除，改用 useProductsByCategory 获取真实商品

export default function CategoriesPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const localize = useLocalizer();
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

  // Why: categories 加载后，如果 activeId 为空或无效，设为第一个分类
  const validActiveId =
    activeId && categories?.some((c) => c.id === activeId)
      ? activeId
      : categories?.[0]?.id ?? '';
  const activeCategory = categories?.find((c) => c.id === validActiveId);

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
        <View style={[styles.sidebar, { backgroundColor: colors['surface-container-low'] }]}>
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
              {/* Daily Deals 横幅（HTML 第 222-238 行） */}
              <Pressable
                onPress={() => router.push('/product/list')}
                style={({ pressed }) => [
                  styles.dealsBanner,
                  {
                    backgroundColor: colors['surface-container-high'],
                    borderColor: 'rgba(141,112,108,0.3)',
                  },
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('category.dealsA11y')}
              >
                <View style={styles.dealsLeft}>
                  <View style={[styles.dealsIcon, { backgroundColor: 'rgba(150,24,19,0.1)' }]}>
                    <Icon symbol="sell" size={24} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.dealsTitle, { color: colors['on-surface'] }]}>
                      {t('category.dealsTitle')}
                    </Text>
                    <Text style={[styles.dealsSub, { color: colors['on-surface-variant'] }]}>
                      {t('category.dealsSub')}
                    </Text>
                  </View>
                </View>
                <View style={styles.dealsRight}>
                  <Text style={[styles.dealsView, { color: colors.primary }]}>
                    {t('common.view')}
                  </Text>
                  <Icon symbol="chevron_right" size={18} color={colors.primary} />
                </View>
              </Pressable>

              {/* 分类标题 + TaisDivider */}
              <View style={styles.titleWrap}>
                <Text style={[styles.catTitle, { color: colors['on-surface'] }]}>
                  {activeCategory?.name ?? ''}
                </Text>
                <TaisDivider width={64} />
              </View>

              {/* 子分类圆形图标 */}
              <View style={styles.subGrid}>
                {SUB_CATEGORIES.map((sub) => (
                  <Pressable
                    key={sub.id}
                    onPress={() => router.push('/search')}
                    style={styles.subItem}
                    accessibilityRole="button"
                    accessibilityLabel={t(sub.labelKey)}
                  >
                    <View
                      style={[
                        styles.subIcon,
                        {
                          backgroundColor: colors['surface-container-high'],
                          borderColor: 'rgba(141,112,108,0.1)',
                        },
                      ]}
                    >
                      <SafeImage source={{ uri: sub.image }} style={styles.subImage} />
                    </View>
                    <Text
                      style={[styles.subLabel, { color: colors['on-surface'] }]}
                      numberOfLines={1}
                    >
                      {t(sub.labelKey)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* HOT PRODUCTS */}
              <View style={styles.hotHeader}>
                <Text style={[styles.hotTitle, { color: colors['on-surface-variant'] }]}>
                  {t('category.hotProducts')}
                </Text>
                <View style={[styles.hotLine, { backgroundColor: 'rgba(141,112,108,0.2)' }]} />
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
                <View style={styles.hotGrid}>
                  {products.slice(0, 8).map((p) => (
                    <View
                      key={p.id}
                      style={[
                        styles.hotCard,
                        {
                          backgroundColor: colors['surface-container-lowest'],
                          borderColor: 'rgba(141,112,108,0.1)',
                        },
                      ]}
                    >
                      {/* Why: 图片+名称+价格可点击跳转详情；+ 按钮独立加购，避免 Pressable 嵌套 */}
                      <Pressable
                        onPress={() => router.push(`/product/${p.id}`)}
                        style={styles.hotClickable}
                        accessibilityRole="button"
                        accessibilityLabel={`View ${localize(p.name)}`}
                      >
                        <View style={[styles.hotImageWrap, { backgroundColor: colors['surface-container'] }]}>
                          <SafeImage source={{ uri: p.image }} style={styles.hotImage} />
                          {p.salesCount && p.salesCount > 100 && (
                            <View style={[styles.hotBadge, { backgroundColor: colors.primary }]}>
                              <Text style={styles.hotBadgeText}>{t('common.badgeNew')}</Text>
                            </View>
                          )}
                        </View>
                        <Text
                          style={[styles.hotName, { color: colors['on-surface'] }]}
                          numberOfLines={2}
                        >
                          {localize(p.name)}
                        </Text>
                        <Text style={[styles.hotPrice, { color: colors.primary }]}>
                          ${p.price.toFixed(2)}
                        </Text>
                      </Pressable>
                      <View style={styles.hotBottomRow}>
                        {typeof p.rating === 'number' && (
                          <View style={styles.ratingRow}>
                            <Icon symbol="star" size={12} color={colors.tertiary} />
                            <Text style={[styles.ratingText, { color: colors['on-surface-variant'] }]}>
                              {p.rating.toFixed(1)}
                            </Text>
                          </View>
                        )}
                        <Pressable
                          onPress={() => handleAddToCart(p)}
                          style={({ pressed }) => [
                            styles.hotAddBtn,
                            { backgroundColor: colors.primary },
                            pressed && { transform: [{ scale: 0.9 }] },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={t('product.addToCartLabel', {
                            name: localize(p.name),
                          })}
                        >
                          <Icon symbol="add_shopping_cart" size={18} color="#ffffff" />
                        </Pressable>
                      </View>
                    </View>
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
                    <View style={[styles.hotLine, { backgroundColor: 'rgba(141,112,108,0.2)' }]} />
                  </View>
                  <View style={styles.hotGrid}>
                    {recommended.map((p) => (
                      <View
                        key={p.id}
                        style={[
                          styles.hotCard,
                          {
                            backgroundColor: colors['surface-container-lowest'],
                            borderColor: 'rgba(141,112,108,0.1)',
                          },
                        ]}
                      >
                        <Pressable
                          onPress={() => router.push(`/product/${p.id}`)}
                          style={styles.hotClickable}
                          accessibilityRole="button"
                          accessibilityLabel={`View ${localize(p.name)}`}
                        >
                          <View style={[styles.hotImageWrap, { backgroundColor: colors['surface-container'] }]}>
                            <SafeImage source={{ uri: p.image }} style={styles.hotImage} />
                          </View>
                          <Text
                            style={[styles.hotName, { color: colors['on-surface'] }]}
                            numberOfLines={2}
                          >
                            {localize(p.name)}
                          </Text>
                          <Text style={[styles.hotPrice, { color: colors.primary }]}>
                            ${p.price.toFixed(2)}
                          </Text>
                        </Pressable>
                        <View style={styles.hotBottomRow}>
                          {typeof p.rating === 'number' && (
                            <View style={styles.ratingRow}>
                              <Icon symbol="star" size={12} color={colors.tertiary} />
                              <Text
                                style={[styles.ratingText, { color: colors['on-surface-variant'] }]}
                              >
                                {p.rating.toFixed(1)}
                              </Text>
                            </View>
                          )}
                          <Pressable
                            onPress={() => handleAddToCart(p)}
                            style={({ pressed }) => [
                              styles.hotAddBtn,
                              { backgroundColor: colors.primary },
                              pressed && { transform: [{ scale: 0.9 }] },
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={t('product.addToCartLabel', {
                              name: localize(p.name),
                            })}
                          >
                            <Icon symbol="add_shopping_cart" size={18} color="#ffffff" />
                          </Pressable>
                        </View>
                      </View>
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
                  pressed && { backgroundColor: 'rgba(150,24,19,0.05)' },
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
          backgroundColor: 'rgba(150,24,19,0.1)',
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
      title=""
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
      {/* Daily Deals skeleton */}
      <Skeleton width="100%" height={72} radius={borderRadius.xl} />
      {/* Title skeleton */}
      <View style={{ marginTop: spacing.xl }}>
        <Skeleton width={160} height={32} />
        <View style={{ marginTop: spacing.xs }}>
          <Skeleton width={64} height={4} />
        </View>
      </View>
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
    borderRightColor: 'rgba(141,112,108,0.1)',
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
  dealsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  dealsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dealsIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealsTitle: {
    ...typography['label-caps'],
    fontWeight: '700',
  },
  dealsSub: {
    ...typography['body-sm'],
    fontSize: 10,
  },
  dealsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dealsView: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  titleWrap: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  catTitle: {
    ...typography.h3,
    fontWeight: '600',
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
  hotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.md / 2,
  },
  hotCard: {
    width: '50%',
    paddingHorizontal: spacing.md / 2,
    marginBottom: spacing.md,
  },
  hotImageWrap: {
    position: 'relative',
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  hotImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  hotClickable: {
    gap: spacing.xs,
  },
  hotBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  hotBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hotName: {
    ...typography['body-sm'],
    fontWeight: '600',
    marginTop: spacing.xs,
    minHeight: 36,
  },
  hotPrice: {
    ...typography['price-display'],
    fontSize: 16,
  },
  hotBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    ...typography['body-sm'],
    fontSize: 11,
  },
  hotAddBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
