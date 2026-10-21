// OrderListPage — 还原自 OrderListPage.html
// Fix-20: Primary tais-pattern Header + Tab 栏分隔线 + 状态彩色胶囊
// 批3（#5）：管理模式（与批2 通知管理同形态）——selectMode 勾选批量/单删 + 二次确认 + 离线阻止
import { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Platform,
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
import {
  useOrdersInfinite,
  useCancelOrder,
  useOrderCounts,
  useDeleteOrders,
} from '@/services/queries/useOrders';
import {
  ORDER_TABS,
  isTerminalOrder,
  type OrderTabKey,
  type OrderAction,
} from '@/lib/orderStatusConfig';
import { useNetwork } from '@/hooks/useNetwork';
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
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useOrdersInfinite(active);
  // Why: useInfiniteQuery 返回 InfiniteData<{items,...}[]>，拍平多页 items 为 Order[]
  const orders: Order[] = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  // 批3：管理模式状态（收藏页/通知页 selectMode 同形态）
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { isOffline } = useNetwork();
  const deleteOrders = useDeleteOrders();

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelected(new Set());
  }, []);

  // 批3 审查 P2-1：管理模式下当前 tab 订单删空（切 tab 过滤/删除后）→ 空态与管理栏并存怪异，
  // 渲染期直接收敛（不 useEffect：setState-in-effect 级联渲染禁；条件收敛幂等无环）
  if (selectMode && !isLoading && orders.length === 0) {
    exitSelectMode();
  }

  const executeDelete = useCallback(() => {
    const ids = [...selected];
    deleteOrders.mutate(ids, {
      onSuccess: () => {
        toast.success(t('order.deleted', { count: ids.length }));
        exitSelectMode();
      },
      onError: () => toast.error(t('order.deleteFailed')),
    });
  }, [selected, deleteOrders, t, exitSelectMode]);

  // 规则12：删除属写操作，离线时阻止并提示（不静默失败）
  const removeSelected = useCallback(() => {
    if (selected.size === 0 || deleteOrders.isPending) return;
    if (isOffline) {
      toast.error(t('common.youAreOffline'));
      return;
    }
    // Why: Web 端 Alert 不显示（order cancel / favorites 先例），直接执行；Native 端 Alert 二次确认
    if (Platform.OS === 'web') {
      executeDelete();
      return;
    }
    Alert.alert(t('order.deleteTitle'), t('order.deleteConfirm', { count: selected.size }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: executeDelete },
    ]);
  }, [selected, deleteOrders.isPending, isOffline, t, executeDelete]);

  // P12 Commit 1: 修复 OrderCard action 链路（原 orders.tsx 未传 onAction，footer 按钮 + header delete 全不渲染）
  // 按 OrderAction 6 种类型分发路由；cancel 走 Alert 确认 + useCancelOrder（复用 P10 详情页模式）
  const cancelMutation = useCancelOrder();
  // Why: 批3 A7 —— useCallback 稳定 handleAction 引用（OrderCard 为 React.memo，
  // 内联函数引用每次渲染变化 → memo 浅比较失效全量重渲染）
  const handleAction = useCallback(
    (action: OrderAction, order: Order) => {
      switch (action) {
        case 'pay':
          // C-P3-4（批4）：待支付订单跳详情页原位支付（详情页 BottomActions handlePay），
          // 不经 checkout（checkout 内部走 createOrder，会重复下单）
          router.push({ pathname: '/order/[id]', params: { id: order.id } });
          break;
        case 'track':
          // PENDING_CONFIRM/CONFIRMED 未发货 → 详情页；PICKED 及之后 → 物流追踪页
          if (order.status === 'PENDING_CONFIRM' || order.status === 'CONFIRMED') {
            router.push(`/order/${order.id}`);
          } else {
            // #005 修复（批次2）：tracking 是平铺路由（app/order/tracking.tsx 读 params.id），
            // 原插值 /order/${id}/tracking 匹配不到路由（会落进 [id].tsx 的子路径解析）
            router.push({ pathname: '/order/tracking', params: { id: order.id } });
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
          // N-P2-9（批2）：Web 端 Alert.alert 不显示 → 照 order/[id].tsx 先例直接取消 + toast；
          // Native 端保留 Alert 确认（破坏性操作需确认）
          if (Platform.OS === 'web') {
            cancelMutation.mutate(order.id, {
              onSuccess: () =>
                toast.success(t('order.cancelled', { defaultValue: 'Order cancelled' })),
            });
            break;
          }
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
      // Why: 批3 A7 —— useCallback 稳定 handleAction 引用（OrderCard 为 React.memo，
      // 内联函数每次渲染变化 → memo 浅比较失效全量重渲染）
    },
    [cancelMutation, t],
  );

  // Why: 批3 A7 —— renderItem 同走 useCallback（FlatList 内联闭包同理使 memo 失效）
  // 批3 P2-2：onPress 直传稳定 handler（OrderCard 内部调 onPress(order)），消灭内联箭头
  // 批3：管理模式下整卡点按只勾选（OrderCard 内部两处 Pressable 均走 onPress，不嵌套新按钮——
  // Web 嵌套 Pressable 坑，favorites 先例），onAction 传 undefined 隐藏 footer 操作钮防删除态误触
  // Web 409 修复：非终态订单不可删（后端仅收 COMPLETED/CANCELLED），管理模式点它跳详情不勾选
  const handleCardPress = useCallback(
    (order: Order) => {
      if (selectMode) {
        if (!isTerminalOrder(order.status)) {
          router.push(`/order/${order.id}`);
          return;
        }
        toggleSelect(order.id);
        return;
      }
      router.push(`/order/${order.id}`);
    },
    [selectMode, toggleSelect],
  );
  const renderItem = useCallback(
    ({ item }: { item: Order }) => (
      <OrderCard
        order={item}
        onPress={handleCardPress}
        onAction={selectMode ? undefined : handleAction}
        selectMode={selectMode}
        isSelected={selected.has(item.id)}
        selectDisabled={selectMode && !isTerminalOrder(item.status)}
        testID={`order-card-${item.id}`}
      />
    ),
    [handleCardPress, handleAction, selectMode, selected],
  );

  return (
    <PageErrorBoundary pageName="orders">
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        <PrimaryHeader
          title={
            selectMode ? t('order.selectedTitle', { count: selected.size }) : t('profile.orders')
          }
          rightActions={
            selectMode ? (
              <Pressable
                onPress={exitSelectMode}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                testID="orders-exit-select"
              >
                <Text style={[styles.headerActionText, { color: ON_PRIMARY }]}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
            ) : (
              <>
                <Pressable
                  onPress={() => setSelectMode(true)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('order.a11y.manage')}
                  testID="orders-manage"
                >
                  <Text style={[styles.headerActionText, { color: ON_PRIMARY }]}>
                    {t('order.manage')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/service/help')}
                  hitSlop={8}
                  style={styles.headerBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('profile.help')}
                  testID="orders-help"
                >
                  <Icon symbol="support_agent" size={24} color={ON_PRIMARY} />
                </Pressable>
              </>
            )
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
                          <Text
                            // F3：文字色随底色走 theme（暗色 primary/error 是浅红，恒白对比度不足）
                            style={[
                              styles.tabBadgeText,
                              { color: isActive ? colors['on-primary'] : colors['on-error'] },
                            ]}
                            accessible={false}
                          >
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
            renderItem={renderItem}
          />
        )}

        {/* 批3：管理栏底部悬浮（favorites.tsx manageBar 同款规格）——全选 + 删除 */}
        {selectMode && (
          <View
            style={[
              styles.manageBar,
              {
                backgroundColor: colors['surface-container-lowest'],
                borderTopColor: colors['outline-variant'],
              },
            ]}
          >
            <Pressable
              onPress={() => {
                // Web 409 修复：全选只收终态单（非终态后端 409 整批拒绝，与卡片禁勾同规则）
                const deletable = orders.filter((o) => isTerminalOrder(o.status));
                const all = new Set(deletable.map((o) => o.id));
                setSelected(
                  deletable.length > 0 && deletable.every((o) => selected.has(o.id))
                    ? new Set()
                    : all,
                );
              }}
              style={styles.manageBarBtn}
              accessibilityRole="button"
              accessibilityLabel={t('common.selectAll')}
            >
              <Icon
                symbol={
                  orders.some((o) => isTerminalOrder(o.status)) &&
                  orders.filter((o) => isTerminalOrder(o.status)).every((o) => selected.has(o.id))
                    ? 'check_circle'
                    : 'radio_button_unchecked'
                }
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.manageBarText, { color: colors['on-surface'] }]}>
                {t('common.selectAll')}
              </Text>
            </Pressable>

            <Pressable
              onPress={removeSelected}
              disabled={selected.size === 0 || deleteOrders.isPending}
              style={({ pressed }) => [
                styles.manageBarDelete,
                {
                  backgroundColor:
                    selected.size === 0 || deleteOrders.isPending
                      ? colors['outline-variant']
                      : colors.error,
                  opacity: selected.size === 0 || deleteOrders.isPending ? 0.5 : 1,
                },
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('common.delete')}
              accessibilityState={
                selected.size === 0 || deleteOrders.isPending ? { disabled: true } : undefined
              }
              testID="orders-batch-delete"
            >
              <Icon symbol="delete" size={18} color={colors['on-primary']} />
              <Text style={[styles.manageBarDeleteText, { color: colors['on-primary'] }]}>
                {t('common.delete')} ({selected.size})
              </Text>
            </Pressable>
          </View>
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
  headerActionText: {
    // Why: ON_PRIMARY 运行时注入（header 红底白字，styles 模块级拿不到 colors）
    ...typography['label-caps'],
    fontWeight: '700',
    fontSize: 13,
  },
  manageBar: {
    // 批3：底部悬浮（favorites.tsx 同款）——absolute 挂 SafeAreaWrapper，bottom 0 落 safe area 内
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout['container-margin'],
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  manageBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  manageBarText: {
    ...typography['body-md'],
    fontWeight: '600',
  },
  manageBarDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  manageBarDeleteText: {
    // Why: on-primary 运行时注入（error 红底白字，同上）
    ...typography['label-caps'],
    fontWeight: '700',
    fontSize: 12,
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
    // F3：底色运行时按 isActive 分流（on-primary/on-error），静态段不留 color
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
