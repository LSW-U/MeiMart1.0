import { StyleSheet, View, FlatList, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme, spacing } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ProductCard } from '@/components/business/ProductCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useProducts, useProductsByCategory } from '@/services/queries/useProducts';
import type { Product } from '@/types';

export default function ProductListPage() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ category?: string; q?: string }>();

  const categoryQuery = useProductsByCategory(params.category);
  const allQuery = useProducts();

  const query = params.category ? categoryQuery : allQuery;
  const { data: products, isLoading, isError, refetch } = query;

  const title = params.category ? '分类商品' : '全部商品';

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title={title} showBack onBackPress={() => router.back()} />
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <ErrorState message="加载商品失败" onRetry={() => refetch()} />
      ) : !products || products.length === 0 ? (
        <EmptyState title="暂无商品" description="此筛选下还没有商品" icon="package-variant" />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item }: { item: Product }) => (
            <View style={styles.cell}>
              <ProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} />
            </View>
          )}
        />
      )}
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: spacing.xxl * 2 },
  row: { gap: spacing.md, marginBottom: spacing.md },
  cell: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
