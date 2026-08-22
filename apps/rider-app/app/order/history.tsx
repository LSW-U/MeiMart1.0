import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { OrderHistoryCard } from '../../src/components/business/HistoryItem';
import { QueryBoundary } from '../../src/components/feedback/QueryBoundary';
import { AppIcon, Skeleton } from '../../src/components/ui';
import { useGoBack } from '../../src/hooks/useGoBack';
import { useTranslation } from '../../src/i18n/useTranslation';
import { useOrderHistory, useOrderStatusCounts, useOrderTodayStats } from '../../src/services/queries/useOrder';
import type { OrderHistoryStatus } from '../../src/types/order';
import { formatCurrency } from '../../src/utils/format';

type FilterKey = 'all' | OrderHistoryStatus;

const filters: { key: FilterKey; labelKey: 'history.tab.all' | 'history.tab.completed' | 'history.tab.cancelled' | 'history.tab.transferred' }[] = [
  { key: 'all', labelKey: 'history.tab.all' },
  { key: 'completed', labelKey: 'history.tab.completed' },
  { key: 'cancelled', labelKey: 'history.tab.cancelled' },
  { key: 'transferred', labelKey: 'history.tab.transferred' },
];

const statusToneMap: Record<OrderHistoryStatus, 'history.status.completed' | 'history.status.cancelled' | 'history.status.transferred'> = {
  completed: 'history.status.completed',
  cancelled: 'history.status.cancelled',
  transferred: 'history.status.transferred',
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};


export default function OrderHistoryPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const goBack = useGoBack('/(main)/profile');
  const [filter, setFilter] = useState<FilterKey>('all');

  // E3 §3.1: 三态解构——补 isLoading/isError/refetch，避免 = [] 默认值吞 loading 落空态、
  // error 静默回退误报「暂无订单」。列表用 QueryBoundary，counts/todayStats 各自独立处理三态。
  const { data: orders, isLoading: ordersLoading, isError: ordersError, refetch: refetchOrders } = useOrderHistory();
  const { data: counts, isLoading: countsLoading, isError: countsError } = useOrderStatusCounts();
  const { data: todayStats, isLoading: todayLoading, isError: todayError } = useOrderTodayStats();
  const statusCounts = counts ?? { all: 0, completed: 0, cancelled: 0, transferred: 0 };
  const today = todayStats ?? { count: 0, totalIncome: 0 };

  // E3 审查 P2-1：QueryBoundary 的 data 传「原始 orders」而非 filter 后列表，
  // 让 data===undefined 兜底恢复生效（error/未请求态不再纯靠 isError 兜）。
  // filter 在 children 内做（filteredOrders）——与组件契约「请求状态 ≠ 不存在」一致，
  // 避免 filter 把 undefined 吞成 [] 后 error 态落入 isEmpty([]) 误报「暂无订单」。
  const filteredOrders = (list: typeof orders) =>
    list && filter !== 'all' ? list.filter((order) => order.status === filter) : list;

  // E3 §3.1: 底栏 counts/todayStats 三态——loading 骨架条 / error 或无数据 `—` / data 正常。
  // 单行不单独用 QueryBoundary（骨架过度），与 E1 summary 底栏同策略。
  const todayLabel = todayLoading || todayError || todayStats == null
    ? '—'
    : t('history.todayOrders', { count: today.count });
  const todayValue = todayLoading || todayError || todayStats == null
    ? '—'
    : `${today.count} · ${formatCurrency(today.totalIncome, t('common.currency'))}`;

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-surface-variant bg-surface px-4 py-4">
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} className="rounded-full p-2" onPress={() => void goBack()}>
          <AppIcon className="text-2xl text-on-surface" name="chevronLeft" size={28} />
        </Pressable>
        <Text className="flex-1 pr-8 text-center text-2xl font-bold tracking-tight text-on-surface">{t('history.title')}</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-md px-4 pb-28 pt-4">
        <View className="mb-6 flex-row gap-2 border-b border-surface-variant pb-2">
          {filters.map(({ key, labelKey }) => {
            const active = filter === key;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(labelKey)}
                accessibilityState={{ selected: active }}
                key={key}
                className={`flex-1 items-center justify-center rounded-full border px-2 py-2 ${
                  active ? 'border-primary bg-primary' : 'border-outline-variant bg-surface'
                }`}
                onPress={() => setFilter(key)}
              >
                <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-on-surface-variant'}`}>
                  {t(labelKey)} ({countsLoading || countsError || counts == null ? '—' : statusCounts[key]})
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* E3 §3.1: 订单列表用 QueryBoundary 三态（loading 骨架 / error 重试 / empty 空态 / data 列表）。
            E3 审查 P2-1：data 传原始 orders（T | undefined），让 data===undefined 兜底恢复生效；
            filter 在 children 内做（filteredOrders）。isEmpty 判 filter 后空——但注意 filter 切换
            到无匹配状态时应显示空态而非「加载失败」，故 isEmpty 接收原始 orders 再按 filter 判。 */}
        <QueryBoundary
          data={orders}
          isLoading={ordersLoading}
          isError={ordersError}
          isEmpty={(list) => filteredOrders(list)?.length === 0}
          errorTitle={t('common.loadError.title')}
          errorMessage={t('common.loadError.desc')}
          retryLabel={t('common.retry')}
          emptyTitle={t('history.empty')}
          skeleton="list"
          onRetry={() => void refetchOrders()}
        >
          {(list) => (filteredOrders(list) ?? []).map((order) => (
            <OrderHistoryCard
              key={order.id}
              dropoffAddress={order.dropoffAddress}
              dropoffName={order.dropoffName}
              income={order.income > 0 ? formatCurrency(order.income, t('common.currency')) : t('history.noIncome')}
              incomeLabel={t('history.income')}
              isPositive={order.income > 0}
              orderNo={order.orderNo}
              pickupAddress={order.pickupAddress}
              pickupName={order.pickupName}
              status={t(statusToneMap[order.status])}
              statusTone={order.status}
              time={formatTime(order.completedAt)}
              viewDetailsLabel={t('history.viewDetails')}
              onPress={() => router.push(`/order/${order.id}`)}
            />
          ))}
        </QueryBoundary>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-outline-variant bg-surface-container-high px-4 py-4 shadow-sm">
        <View className="mx-auto flex-row w-full max-w-md items-center justify-between">
          <Text className="font-bold text-on-surface">{todayLabel}</Text>
          {todayLoading ? (
            <Skeleton className="h-5 w-28" />
          ) : (
            <Text className="text-xl font-bold text-primary">{todayValue}</Text>
          )}
        </View>
      </View>
    </View>
  );
}
