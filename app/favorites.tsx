import { StyleSheet, View, FlatList, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ProductCard } from '@/components/business/ProductCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useFavorites } from '@/services/queries/useUser';
import type { Product } from '@/types';

export default function FavoritesPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { data: favorites, isLoading, isError, refetch } = useFavorites();

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title={t('favorites.title')} showBack onBackPress={() => router.back()} />
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <ErrorState message={t('favorites.loadError')} onRetry={() => refetch()} />
      ) : !favorites || favorites.length === 0 ? (
        <EmptyState
          title={t('favorites.empty')}
          description={t('favorites.emptyDesc')}
          icon="heart-outline"
        />
      ) : (
        <FlatList
          data={favorites}
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
  list: { padding: spacing.md },
  row: { gap: spacing.md, marginBottom: spacing.md },
  cell: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
