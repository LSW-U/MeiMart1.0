import { StyleSheet, View, FlatList, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme, spacing } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ProductCard } from '@/components/business/ProductCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useProductSearch } from '@/services/queries/useProducts';
import { useDebounce } from '@/hooks/useDebounce';
import type { Product } from '@/types';

export default function SearchResultsPage() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ q: string }>();
  const keyword = useDebounce(params.q ?? '', 300);
  const { data: results, isLoading, isError, refetch } = useProductSearch(keyword);

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title={`「${params.q ?? ''}」`} showBack onBackPress={() => router.back()} />
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <ErrorState message="搜索失败" onRetry={() => refetch()} />
      ) : !results || results.length === 0 ? (
        <EmptyState
          title="没有找到相关商品"
          description={`没有与「${params.q ?? ''}」相关的商品`}
          icon="package-variant-removed"
        />
      ) : (
        <FlatList
          data={results}
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
