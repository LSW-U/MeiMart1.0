import { useState } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { TabBar } from '@/components/layout/TabBar';
import { OrderCard } from '@/components/business/OrderCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useOrders } from '@/services/queries/useOrders';
import type { OrderStatus, Order } from '@/types';

const TABS: { key: OrderStatus | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待付款' },
  { key: 'paid', label: '待发货' },
  { key: 'shipped', label: '待收货' },
  { key: 'delivered', label: '已完成' },
];

export default function OrdersPage() {
  const { colors } = useTheme();
  const [active, setActive] = useState<OrderStatus | 'all'>('all');
  const { data: orders, isLoading, isError, refetch } = useOrders(active);

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <View style={[styles.header, { backgroundColor: colors['surface-container-lowest'] }]}>
        <Text style={[styles.title, { color: colors['on-surface'] }]} accessibilityRole="header">
          我的订单
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={[styles.backBtn, { color: colors.primary }]}>返回</Text>
        </Pressable>
      </View>
      <TabBar
        tabs={TABS.map((t) => t.label)}
        activeIndex={TABS.findIndex((t) => t.key === active)}
        onTabChange={(idx) => setActive(TABS[idx].key)}
      />
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <ErrorState message="加载订单失败" onRetry={() => refetch()} />
      ) : !orders || orders.length === 0 ? (
        <EmptyState
          title="没有相关订单"
          description="去首页看看喜欢的商品吧"
          icon="clipboard-text-outline"
          actionLabel="去逛逛"
          onAction={() => router.push('/(main)/home')}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: { item: Order }) => (
            <OrderCard order={item} onPress={() => router.push(`/order/${item.id}`)} />
          )}
        />
      )}
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  title: { ...typography.h3, fontWeight: '700' },
  backBtn: { ...typography['body-sm'], fontWeight: '600' },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
