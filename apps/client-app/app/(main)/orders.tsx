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
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { toast } from '@/store/toastStore';
import { useTheme, spacing, layout, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { OrderCard } from '@/components/business/OrderCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TaisDivider } from '@/components/cultural/TaisDivider';
import { Icon } from '@/components/ui/Icon';
import { useOrdersInfinite, useCancelOrder, useOrderCounts } from '@/services/queries/useOrders';
import { ORDER_TABS, type OrderTabKey, type OrderAction } from '@/lib/orderStatusConfig';
import type { Order } from '@/types';
import { PageErrorBoundary } from '@/components/feedback/PageErrorBoundary/PageErrorBoundary';
import { PageSkeleton } from '@/components/feedback/PageSkeleton/PageSkeleton';

// Why: error/primary 底白字（ON_PRIMARY 模式，dark 不变；与 P10/P11 现状一致，待统一抽到 theme）
const ON_PRIMARY = '#ffffff';

export default function OrdersPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [active, setActive] = useState<OrderTabKey>('all');
  const counts = useOrderCounts();
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useOrdersInfinite(active);
  // Why: useInfiniteQuery 返回 InfiniteData<{items,...}[]>，拍平多页 items 为 Order[]
  const orders: Order[] = data?.pages.flatMap((p) => p.items) ?? [];

  // P12 Commit 1: 修复 OrderCard action 链路（原 orders.tsx 未传 onAction，footer 按钮 + header delete 全不渲染）
  // 按 OrderAction 6 种类型分发路由；cancel 走 Alert 确认 + useCancelOrder（复用 P10 详情页模式）
  const cancelMutation = useCancelOrder();
  const handleAction = (action: OrderAction, order: Order) => {
    switch (action) {
      case 'pay':
        // 与 P10 详情页 [id].tsx:702 一致（checkout 页内部走 createOrder，pay 的订单支付入口待支付模块）
        router.push('/order/checkout');
        break;
      case 'track':
        // PENDING_CONFIRM/CONFIRMED 未发货 → 详情页；PICKED 及之后 → 物流追踪页
        if (order.status === 'PENDING_CONFIRM' || order.status === 'CONFIRMED') {
          router.push(`/order/${order.id}`);
        } else {
          router.push(`/order/${order.id}/tracking`);
        }
        break;
      case 'review':
        router.push({
          pathname: '/order/review',
          params: { id: order.id, productId: order.items[0]?.product.id ?? '' },
        });
        break;
      case 'after-sales':
        router.push({
          pathname: '/order/after-sales-apply',
          params: { orderId: order.id },
        });
        break;
      case 'repurchase': {
        // 取首商品 productId 跳详情页，用户在详情页重新加购（不直接下单，避免 skuId 缺失）
        const productId = order.items[0]?.product.id;
        if (productId) router.push(`/product/${productId}`);
        break;
      }
      case 'cancel':
        Alert.alert(t('order.cancelTitle'), t('order.cancelConfirm'), [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            style: 'destructive',
            onPress: () =>
              cancelMutation.mutate(order.id, {
                onSuccess: () =>
                  toast.success(t('order.cancelled', { defaultValue: 'Order cancelled' })),
              }),
          },
        ]);
        break;
    }
  };

  return (
    <PageErrorBoundary pageName="orders">
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <PrimaryHeader
        title={t('profile.orders')}
        rightActions={
          <Pressable
            onPress={() => router.push('/service/help')}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel={t('profile.help')}
          >
            <Icon symbol="help" size={24} color={ON_PRIMARY} />
          </Pressable>
        }
      />

      {/* Tab 栏（HTML 第 ? 行：border-b border-outline-variant/30，激活态 primary） */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: colors['surface-container-lowest'],
            borderBottomColor: colors['outline-variant'],
          },
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabRow}>
            {ORDER_TABS.map((tab) => {
              const isActive = tab.key === active;
              // Why: 业务 Tab 显示角标计数（to-pay/ship/receive/review），all 不显示；count>0 才渲染避免假 0
              const count = tab.countable && tab.key !== 'all' ? counts[tab.key] : 0;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActive(tab.key)}
                  style={styles.tabBtn}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={
                    count > 0
                      ? t('order.tabWithCount', {
                          label: t(tab.labelKey),
                          count,
                          defaultValue: '{{label}}, {{count}}',
                        })
                      : t(tab.labelKey)
                  }
                >
                  <View style={styles.tabContent}>
                    <Text
                      style={[
                        styles.tabText,
                        {
                          color: isActive ? colors.primary : colors['on-surface-variant'],
                        },
                      ]}
                    >
                      {t(tab.labelKey)}
                    </Text>
                    {count > 0 && (
                      <View
                        style={[
                          styles.tabBadge,
                          // V17：激活 Tab 角标变 primary（与 tab 文字同色系），非激活才 error
                          { backgroundColor: isActive ? colors.primary : colors.error },
                        ]}
                        accessible={false}
                      >
                        <Text style={styles.tabBadgeText} accessible={false}>
                          {count}
                        </Text>
                      </View>
                    )}
                  </View>
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
        <PageSkeleton variant="list" rows={5} />
      ) : isError ? (
        <ErrorState message={t('errors.orders')} onRetry={() => refetch()} />
      ) : !orders || orders.length === 0 ? (
        <EmptyState
          title={t('order.emptyTitle')}
          description={t('order.emptyDesc')}
          icon="clipboard-text-outline"
          actionLabel={t('favorites.goBrowse')}
          onAction={() => router.push('/(main)/home')}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={5}
          contentContainerStyle={styles.list}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          ItemSeparatorComponent={() => (
            <View style={styles.dividerWrap}>
              <TaisDivider />
            </View>
          )}
          renderItem={({ item }: { item: Order }) => (
            <OrderCard
              order={item}
              onPress={() => router.push(`/order/${item.id}`)}
              onAction={handleAction}
            />
          )}
        />
      )}
    </SafeAreaWrapper>
    </PageErrorBoundary>
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
    paddingHorizontal: layout['container-margin'],
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tabBtn: {
    position: 'relative',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  tabText: {
    ...typography['label-caps'],
    fontSize: 13,
    textTransform: 'none',
    letterSpacing: 0,
  },
  tabBadge: {
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    color: ON_PRIMARY,
    fontSize: 10,
    fontWeight: '700',
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
    padding: layout['container-margin'],
    paddingBottom: spacing.xxl * 2,
  },
  dividerWrap: {
    paddingVertical: spacing.sm,
  },
  footerLoading: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
