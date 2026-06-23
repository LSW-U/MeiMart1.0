import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { OrderHistoryCard } from '../../src/components/business/HistoryItem';
import { EmptyState } from '../../src/components/feedback/EmptyState';
import { useGoBack } from '../../src/hooks/useGoBack';
import { useTranslation } from '../../src/i18n/useTranslation';
import { useOrderStore } from '../../src/store/useOrderStore';
import type { OrderHistoryStatus } from '../../src/types/order';

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

const formatIncome = (income: number, fallback: string, currency: string) => (income > 0 ? `${currency}${income.toFixed(2)}` : fallback);

export default function OrderHistoryPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const goBack = useGoBack('/(main)/profile');
  const [filter, setFilter] = useState<FilterKey>('all');
  const orders = useOrderStore((s) => s.history);
  const counts = useOrderStore((s) => s.statusCounts);
  const todayStats = useOrderStore((s) => s.todayStats);
  const hydrate = useOrderStore((s) => s.hydrate);

  useFocusEffect(
    useCallback(() => {
      let unsub: (() => void) | undefined;
      void hydrate().then((fn) => { unsub = fn; });
      return () => { unsub?.(); };
    }, [hydrate]),
  );

  const visibleOrders = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter((order) => order.status === filter);
  }, [orders, filter]);

  return (
    <View className="flex-1 bg-[#fff8f7]">
      <View className="flex-row items-center justify-between border-b border-[#f7ddd9] bg-[#fff8f7] px-4 py-4">
        <Pressable className="rounded-full p-2" onPress={() => void goBack()}>
          <Text className="text-2xl text-[#261816]">‹</Text>
        </Pressable>
        <Text className="flex-1 pr-8 text-center text-2xl font-bold tracking-tight text-[#261816]">{t('history.title')}</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-md px-4 pb-28 pt-4">
        <View className="mb-6 flex-row items-center justify-between rounded-lg border border-[#e1bfba] bg-white p-3 shadow-sm">
          <Text className="font-bold text-[#261816]">{t('history.date')}</Text>
          <Text className="text-[#8d706c]">{t('history.calendar')}</Text>
        </View>

        <View className="mb-6 flex-row gap-2 border-b border-[#f7ddd9] pb-2">
          {filters.map(({ key, labelKey }) => {
            const active = filter === key;
            return (
              <Pressable
                key={key}
                className={`flex-1 items-center justify-center rounded-full border px-2 py-2 ${
                  active ? 'border-[#720003] bg-[#720003]' : 'border-[#e1bfba] bg-white'
                }`}
                onPress={() => setFilter(key)}
              >
                <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-[#59413d]'}`}>
                  {t(labelKey)} ({counts[key]})
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="gap-4">
          {visibleOrders.length === 0 ? (
            <EmptyState title={t('history.empty')} />
          ) : (
            visibleOrders.map((order) => (
              <OrderHistoryCard
                key={order.id}
                dropoffAddress={order.dropoffAddress}
                dropoffName={order.dropoffName}
                income={formatIncome(order.income, t('history.noIncome'), t('common.currency'))}
                incomeLabel={t('history.income')}
                orderNo={order.orderNo}
                pickupAddress={order.pickupAddress}
                pickupName={order.pickupName}
                status={t(statusToneMap[order.status])}
                statusTone={order.status}
                time={formatTime(order.completedAt)}
                viewDetailsLabel={t('history.viewDetails')}
                onPress={() => router.push(`/order/${order.id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-[#e1bfba] bg-[#fde2df] px-4 py-4 shadow-sm">
        <View className="mx-auto flex-row w-full max-w-md items-center justify-between">
          <Text className="font-bold text-[#261816]">{t('history.todayOrders')}</Text>
          <Text className="text-xl font-bold text-[#720003]">{todayStats.count} · {t('common.currency')}{todayStats.totalIncome.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
}
