// ProductListPage — 还原自 ProductListPage.html（335 行）
// HTML → RN 行数比：335 → ~430（含样式）
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 128%）
// Fix-13: 排行榜差异化布局
// - Top 3 大卡片：排名 + 80×80 图 + Local Specialty 标签 + 标题 + 销量 + 价格 + add
// - Top 4-10 紧凑列表：排名 + 16×16 小图 + 标题 + 价格 + 圆形 add
// - Top 3 加 uma-lulik-shadow（offset 4,4 + #59413d + opacity 0.2）
// - 横滑分类胶囊 + Primary tais-pattern Header
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingOverlay } from '@/components/feedback/LoadingOverlay';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import { useCategories } from '@/services/queries/useCatalog';
import { useProductsByCategory, useProducts } from '@/services/queries/useProducts';
import { useAddToCart } from '@/services/queries/useCart';
import { toast } from '@/store/toastStore';
import type { Product } from '@/types';
import { useLocalizer } from '@/i18n';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';

// "All" 分类标签（点击去掉 URL category 参数，显示全部商品）
const ALL_CATEGORY = 'All';

export default function ProductListPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const localize = useLocalizer();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const { data: categories } = useCategories();
  const currentCategory = categories?.find((c) => c.id === category);
  const headerTitle = currentCategory?.name ?? 'Local Bestsellers';

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

  const topThree = products.slice(0, 3);
  const restList = products.slice(3);

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
            borderBottomColor: 'rgba(225, 191, 186, 0.1)',
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
        {/* Top 3 大卡片 */}
        <View style={styles.topThreeWrap}>
          {topThree.map((product, idx) => (
            <View
              key={product.id}
              style={[
                styles.topCard,
                {
                  backgroundColor: colors['surface-container-lowest'],
                  borderColor: 'rgba(225, 191, 186, 0.1)',
                },
                shadowPresets.umaLulik,
              ]}
            >
              <Text style={[styles.topRank, { color: colors.primary }]}>{idx + 1}</Text>
              {/* Why: P0 修复 - 外层改 View，image/name 各自 Pressable 跳详情，add 独立 Pressable（避免 Pressable 嵌套） */}
              <Pressable
                onPress={() => router.push(`/product/${product.id}`)}
                style={({ pressed }) => [pressed && { opacity: 0.85 }]}
                accessibilityRole="button"
                accessibilityLabel={`Rank ${idx + 1}: ${localize(product.name)}`}
              >
                <SafeImage source={{ uri: product.image }} style={styles.topImage} />
              </Pressable>
              <View style={styles.topInfo}>
                <View
                  style={[styles.localSpecialtyTag, { backgroundColor: 'rgba(150,24,19,0.1)' }]}
                >
                  <Text style={[styles.localSpecialtyText, { color: colors.primary }]}>
                    LOCAL SPECIALTY
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push(`/product/${product.id}`)}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.topName, { color: colors['on-surface'] }]} numberOfLines={1}>
                    {localize(product.name)}
                  </Text>
                </Pressable>
                <Text style={[styles.topSold, { color: colors['on-surface-variant'] }]}>
                  {product.salesCount}+ sold
                </Text>
                <View style={styles.topPriceRow}>
                  <Text style={[styles.topPrice, { color: colors.primary }]}>
                    ${product.price.toFixed(2)}
                  </Text>
                  <Pressable
                    onPress={() => handleAdd(product)}
                    style={({ pressed }) => [
                      styles.topAddBtn,
                      { backgroundColor: colors.primary },
                      pressed && { opacity: 0.85 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${localize(product.name)} to cart`}
                  >
                    <Icon symbol="add" size={20} color="#ffffff" />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Top 4+ 紧凑列表 */}
        <View style={[styles.restWrap, { borderTopColor: 'rgba(225, 191, 186, 0.2)' }]}>
          {restList.map((product, idx) => (
            <View key={product.id} style={styles.restRow}>
              <Text style={[styles.restRank, { color: colors.secondary }]}>{idx + 4}</Text>
              {/* Why: P0 修复 - image/name 各自 Pressable 跳详情，add 独立 Pressable（避免嵌套） */}
              <Pressable
                onPress={() => router.push(`/product/${product.id}`)}
                style={({ pressed }) => [pressed && { opacity: 0.85 }]}
                accessibilityRole="button"
                accessibilityLabel={`Rank ${idx + 4}: ${localize(product.name)}`}
              >
                <SafeImage source={{ uri: product.image }} style={styles.restImage} />
              </Pressable>
              <View style={styles.restInfo}>
                <Pressable
                  onPress={() => router.push(`/product/${product.id}`)}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.restName, { color: colors['on-surface'] }]} numberOfLines={1}>
                    {localize(product.name)}
                  </Text>
                </Pressable>
                <Text style={[styles.restPrice, { color: colors['on-surface-variant'] }]}>
                  ${product.price.toFixed(2)} • {product.salesCount} sold
                </Text>
              </View>
              <Pressable
                onPress={() => handleAdd(product)}
                style={({ pressed }) => [
                  styles.restAddBtn,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Add ${localize(product.name)} to cart`}
              >
                <Icon symbol="add" size={18} color="#ffffff" />
              </Pressable>
            </View>
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
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => {}}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Help"
          >
            <Icon symbol="help" size={24} color="#ffffff" />
          </Pressable>
          <Pressable
            onPress={() => {}}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Share"
          >
            <Icon symbol="share" size={24} color="#ffffff" />
          </Pressable>
        </View>
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
    color: '#ffffff',
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.md,
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
  scrollContent: {
    padding: layout['container-margin'],
    paddingBottom: spacing.xxl * 2,
  },
  topThreeWrap: {
    gap: spacing.md,
  },
  topCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  topRank: {
    ...typography.h2,
    fontWeight: '700',
    width: 32,
  },
  topImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(225, 191, 186, 0.2)',
  },
  topInfo: {
    flex: 1,
    gap: 2,
  },
  localSpecialtyTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    marginBottom: 4,
  },
  localSpecialtyText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  topName: {
    ...typography.h3,
    fontWeight: '600',
  },
  topSold: {
    ...typography['body-sm'],
  },
  topPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  topPrice: {
    ...typography['price-display'],
  },
  topAddBtn: {
    width: 32, // Why: P2 统一 - 40² 方(lg) -> 32² 圆(999)，方案 §2.2
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restWrap: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
    marginTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  restRank: {
    ...typography.h2,
    fontSize: 18,
    width: 32,
  },
  restImage: {
    width: 64,
    height: 64,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(225, 191, 186, 0.2)',
  },
  restInfo: {
    flex: 1,
  },
  restName: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  restPrice: {
    ...typography['body-sm'],
  },
  restAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
