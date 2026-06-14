import { StyleSheet, View, FlatList, ActivityIndicator } from 'react-native';
import { useTheme, spacing } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { CouponCard } from '@/components/business/CouponCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useCoupons } from '@/services/queries/useUser';
import type { Coupon } from '@/types';
import { router } from 'expo-router';

export default function CouponsPage() {
  const { colors } = useTheme();
  const { data: coupons, isLoading, isError, refetch } = useCoupons();

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title="优惠券" showBack onBackPress={() => router.back()} />
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <ErrorState message="加载优惠券失败" onRetry={() => refetch()} />
      ) : !coupons || coupons.length === 0 ? (
        <EmptyState
          title="暂无优惠券"
          description="去首页看看有什么可领的吧"
          icon="ticket-percent"
        />
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: { item: Coupon }) => <CouponCard coupon={item} />}
        />
      )}
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
