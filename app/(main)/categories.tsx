import { StyleSheet, View, FlatList, ActivityIndicator, Text } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { SearchBar } from '@/components/business/SearchBar';
import { CategoryGrid } from '@/components/business/CategoryGrid';
import { ProductCard } from '@/components/business/ProductCard';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useCategories } from '@/services/queries/useCatalog';
import { useProductsByCategory } from '@/services/queries/useProducts';
import type { Product, Category } from '@/types';

export default function CategoriesPage() {
  const { colors } = useTheme();
  const {
    data: categories,
    isLoading: catLoading,
    isError: catError,
    refetch: catRefetch,
  } = useCategories();
  const [activeId, setActiveId] = useState<string | undefined>(categories?.[0]?.id);
  const {
    data: products,
    isLoading: prodLoading,
    isError: prodError,
    refetch: prodRefetch,
  } = useProductsByCategory(activeId);

  const handlePress = (c: Category) => setActiveId(c.id);

  if (catLoading) {
    return (
      <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaWrapper>
    );
  }
  if (catError || !categories) {
    return (
      <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
        <ErrorState message="加载分类失败" onRetry={() => catRefetch()} />
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <View style={[styles.header, { backgroundColor: colors['surface-container-lowest'] }]}>
        <SearchBar placeholder="搜索分类…" onSubmit={() => router.push('/search')} />
      </View>
      <View style={styles.body}>
        <View style={[styles.sidebar, { backgroundColor: colors['surface-container-low'] }]}>
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const active = activeId === item.id;
              return (
                <Text
                  onPress={() => handlePress(item)}
                  style={[
                    styles.sidebarItem,
                    {
                      color: active ? colors.primary : colors['on-surface-variant'],
                      backgroundColor: active ? colors.background : 'transparent',
                      borderColor: active ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {item.name}
                </Text>
              );
            }}
          />
        </View>
        <View style={styles.content}>
          <CategoryGrid
            categories={categories.slice(0, 4)}
            columns={2}
            onCategoryPress={handlePress}
          />
          <Text style={[styles.listTitle, { color: colors['on-surface'] }]}>热门商品</Text>
          {prodLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : prodError ? (
            <ErrorState message="加载商品失败" onRetry={() => prodRefetch()} />
          ) : !products || products.length === 0 ? (
            <EmptyState title="暂无商品" description="该分类下还没有商品" icon="package-variant" />
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.row}
              renderItem={({ item }: { item: Product }) => (
                <View style={styles.cell}>
                  <ProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} />
                </View>
              )}
            />
          )}
        </View>
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.md },
  body: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 90 },
  sidebarItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderLeftWidth: 3,
    fontSize: typography['body-sm'].fontSize,
    fontWeight: '500',
  },
  content: { flex: 1, padding: spacing.md },
  listTitle: { ...typography.h3, fontWeight: '700', marginVertical: spacing.md },
  row: { gap: spacing.md, marginBottom: spacing.md },
  cell: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
