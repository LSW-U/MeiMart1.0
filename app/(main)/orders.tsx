// OrderListPage — 还原自 OrderListPage.html
// Fix-20: Primary tais-pattern Header + Tab 栏分隔线 + 状态彩色胶囊
import { useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  Text,
  Pressable,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { OrderCard } from '@/components/business/OrderCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TaisDivider } from '@/components/cultural/TaisDivider';
import { Icon } from '@/components/ui/Icon';
import { useOrders } from '@/services/queries/useOrders';
import type { OrderStatus, Order } from '@/types';

const TABS: { key: OrderStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'To Pay' },
  { key: 'paid', label: 'To Ship' },
  { key: 'shipped', label: 'To Receive' },
  { key: 'delivered', label: 'Completed' },
];

export default function OrdersPage() {
  const { colors } = useTheme();
  const [active, setActive] = useState<OrderStatus | 'all'>('all');
  const { data: orders, isLoading, isError, refetch } = useOrders(active);

  return (
    <SafeAreaWrapper edges={['bottom']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBarConfig />
      <PrimaryHeader
        title="My Orders"
        rightActions={
          <Pressable
            onPress={() => router.push('/service/help')}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Help"
          >
            <Icon symbol="help" size={24} color="#ffffff" />
          </Pressable>
        }
      />

      {/* Tab 栏（HTML 第 ? 行：border-b border-outline-variant/30，激活态 primary） */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: colors['surface-container-lowest'],
            borderBottomColor: 'rgba(141,112,108,0.3)',
          },
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabRow}>
            {TABS.map((tab) => {
              const isActive = tab.key === active;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActive(tab.key)}
                  style={styles.tabBtn}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={tab.label}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: isActive ? colors.primary : colors['on-surface-variant'],
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                  {isActive && (
                    <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <ErrorState message="Failed to load orders" onRetry={() => refetch()} />
      ) : !orders || orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Browse products and place your first order"
          icon="clipboard-text-outline"
          actionLabel="Browse Products"
          onAction={() => router.push('/(main)/home')}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => (
            <View style={styles.dividerWrap}>
              <TaisDivider />
            </View>
          )}
          renderItem={({ item }: { item: Order }) => (
            <OrderCard order={item} onPress={() => router.push(`/order/${item.id}`)} />
          )}
        />
      )}
    </SafeAreaWrapper>
  );
}

// Primary tais-pattern Header（HTML 第 141-153 行：arrow_back + My Orders + help）
// 已迁移到 PrimaryHeader 组件（CP-FIX P1-3）

const styles = StyleSheet.create({
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing['container-margin'],
  },
  tabBtn: {
    position: 'relative',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  tabText: {
    ...typography['label-caps'],
    fontSize: 13,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: spacing.md,
    right: spacing.md,
    height: 2,
    borderRadius: 1,
  },
  list: {
    padding: spacing['container-margin'],
    paddingBottom: spacing.xxl * 2,
  },
  dividerWrap: {
    paddingVertical: spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
