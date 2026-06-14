import { StyleSheet, View, Text, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { SearchBar } from '@/components/business/SearchBar';
import { BannerCarousel } from '@/components/business/BannerCarousel';
import { CategoryGrid } from '@/components/business/CategoryGrid';
import { PromoShortcut } from '@/components/business/PromoShortcut';
import { ProductCard } from '@/components/business/ProductCard';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TaisDivider } from '@/components/cultural/TaisDivider';
import { LogoBadge } from '@/components/cultural/LogoBadge';
import { useCategories, useBanners } from '@/services/queries/useCatalog';
import { useRecommendations } from '@/services/queries/useProducts';
import { useWeakNetworkUI } from '@/hooks/useWeakNetworkUI';
import type { Product } from '@/types';

const SHORTCUTS = [
  { id: 'flash', title: '限时秒杀', icon: 'lightning-bolt' },
  { id: 'new', title: '新品上市', icon: 'new-box' },
  { id: 'sale', title: '满减优惠', icon: 'tag' },
  { id: 'delivery', title: '当日达', icon: 'truck-fast' },
];

export default function HomePage() {
  const { colors } = useTheme();
  const { shouldSkipNonEssential } = useWeakNetworkUI();
  const { data: banners } = useBanners();
  const { data: categories } = useCategories();
  const { data: products, isLoading, isError, refetch } = useRecommendations();

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <View style={[styles.header, { backgroundColor: colors['surface-container-lowest'] }]}>
        <View style={styles.brandRow}>
          <LogoBadge size={32} />
          <Text style={[styles.appName, { color: colors['on-surface'] }]}>MeiMart</Text>
        </View>
        <Pressable onPress={() => router.push('/search')} style={styles.searchTouch}>
          <SearchBar placeholder="搜索商品、品牌、分类…" onSubmit={() => router.push('/search')} />
        </Pressable>
      </View>
      <FlatList
        data={products ?? []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            {!shouldSkipNonEssential && banners && banners.length > 0 && (
              <BannerCarousel
                banners={banners}
                onBannerPress={(b) => b.link && router.push(b.link as any)}
              />
            )}
            <PromoShortcut items={SHORTCUTS} onPress={(item) => router.push('/search')} />
            <TaisDivider />
            {categories && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>分类导航</Text>
                <CategoryGrid
                  categories={categories.slice(0, 8)}
                  onCategoryPress={(c) =>
                    router.push({ pathname: '/product/list', params: { category: c.id } })
                  }
                />
              </View>
            )}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>为你推荐</Text>
              {isLoading && <ActivityIndicator color={colors.primary} />}
              {isError && <ErrorState message="加载商品失败" onRetry={() => refetch()} />}
            </View>
          </View>
        }
        renderItem={({ item }: { item: Product }) => (
          <View style={styles.cell}>
            <ProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} />
          </View>
        )}
      />
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  appName: { ...typography.h3, fontWeight: '700' },
  searchTouch: {},
  list: { padding: spacing.md, paddingBottom: spacing.xxl * 2 },
  row: { gap: spacing.md, marginBottom: spacing.md },
  cell: { flex: 1 },
  section: { gap: spacing.md, marginTop: spacing.lg },
  sectionTitle: { ...typography.h3, fontWeight: '700' },
});

void Card;
