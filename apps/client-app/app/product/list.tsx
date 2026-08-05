// ProductListPage — 商品列表（§9-3 统一为 HorizontalProductCard 纵向列）
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTheme, spacing, layout, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingOverlay } from '@/components/feedback/LoadingOverlay';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import { HorizontalProductCard } from '@/components/business/HorizontalProductCard/HorizontalProductCard';
import { useCategories } from '@/services/queries/useCatalog';
import { useProductsByCategory, useProducts } from '@/services/queries/useProducts';
import { useAddToCart } from '@/services/queries/useCart';
import { toast } from '@/store/toastStore';
import { resolveBadges } from '@/utils/resolveBadges';
import type { Product } from '@/types';

// "All" 分类标签（点击去掉 URL category 参数，显示全部商品）
const ALL_CATEGORY = 'All';

export default function ProductListPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const { data: categories } = useCategories();
  const currentCategory = categories?.find((c) => c.id === category);
  // Why: P9 - 页面定位是「Local Bestsellers 榜单页」，标题恒定；分类是子筛选（active pill 表明当前分类）
  const headerTitle = t('product.localBestsellers');

  // Why: URL 有 category -> 按 category 过滤；无 -> 拿全部
  const byCategoryQuery = useProductsByCategory(category);
  const allQuery = useProducts();
  const products = category ? byCategoryQuery.data : allQuery.data;
  const isLoading = category ? byCategoryQuery.isLoading : allQuery.isLoading;
  const isError = category ? byCategoryQuery.isError : allQuery.isError;
  // Why: P0 修复 - 排行榜加购按钮之前是 View 不可点击，接 useAddToCart 让加购可用
  const addMutation = useAddToCart();
  const handleAdd = (product: Product) => {
    addMutation.mutate({ product, quantity: 1 });
    toast.success(t('product.addedToCart', { defaultValue: 'Added to cart' }));
  };

  // Category Bar: "All" + 真实分类名
  const categoryBar = [ALL_CATEGORY, ...(categories?.map((c) => c.name) ?? [])];
  // Why: Category Bar 点击切换 URL category（保持 URL 驱动，不引入本地 state）
  const switchCategory = (cat: string) => {
    if (cat === ALL_CATEGORY) {
      router.replace('/product/list');
      return;
    }
    const target = categories?.find((c) => c.name === cat);
    if (target) {
      router.replace({ pathname: '/product/list', params: { category: target.id } });
    }
  };

  if (isLoading) {
    return (
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        <Header title={headerTitle} />
        <LoadingOverlay visible />
      </SafeAreaWrapper>
    );
  }

  if (isError) {
    return (
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        <Header title={headerTitle} />
        <ErrorState
          message={t('errors.products', { defaultValue: 'Failed to load products' })}
        />
      </SafeAreaWrapper>
    );
  }

  if (!products || products.length === 0) {
    return (
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        <Header title={headerTitle} />
        <EmptyState
          title={t('products.noProducts', { defaultValue: 'No products' })}
          description={t('products.noProductsDesc', {
            defaultValue: 'No items match this filter',
          })}
          icon="package-variant"
        />
      </SafeAreaWrapper>
    );
  }



  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <Header title={headerTitle} />

      {/* Category Bar 横滑分类 */}
      <View
        style={[
          styles.categoryBar,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors['outline-variant'],
          },
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoryRow}>
            {categoryBar.map((cat) => {
              const active = cat === ALL_CATEGORY ? !category : cat === currentCategory?.name;
              return (
                <Pressable
                  key={cat}
                  onPress={() => switchCategory(cat)}
                  style={[
                    styles.categoryPill,
                    active
                      ? { backgroundColor: colors.primary }
                      : {
                          backgroundColor: colors['surface-container-lowest'],
                          borderColor: colors.primary,
                        },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Category: ${cat}`}
                >
                  <Text
                    style={[styles.categoryText, { color: active ? '#ffffff' : colors.primary }]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* §9-3 去排名 + 统一 HorizontalProductCard（原 Top3 + Top4+ 两段合并） */}
        <View style={styles.listColumn}>
          {products.map((product) => (
            <HorizontalProductCard
              key={product.id}
              product={product}
              badge={resolveBadges(product, t)[0]}
              onPress={() => router.push(`/product/${product.id}`)}
              onAddToCart={() => handleAdd(product)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

// Primary tais-pattern Header（HTML 第 135 行）
function Header({ title }: { title: string }) {
  const { colors } = useTheme();
  const handleBack = useSafeBack();
  return (
    <View style={[styles.header, { backgroundColor: colors.primary }]}>
      <View style={styles.headerPattern} pointerEvents="none">
        <TaisPattern width={390} height={56} opacity={0.1} />
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
        <Text style={styles.headerTitle} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerRightPlaceholder} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: layout['container-margin'],
    justifyContent: 'center',
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
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
    color: '#ffffff',
    fontWeight: '600',
  },
  headerRightPlaceholder: {
    width: 40,
  },
  categoryBar: {
    paddingVertical: spacing.sm,
    paddingHorizontal: layout['container-margin'],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
  },
  categoryText: {
    ...typography['label-caps'],
    fontSize: 12,
  },
  // Why: §9-3 - 商品列表纵向列（替 topThreeWrap + restWrap 分段）
  listColumn: {
    gap: spacing.md,
  },
  scrollContent: {
    padding: layout['container-margin'],
    paddingBottom: spacing.xxl * 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
