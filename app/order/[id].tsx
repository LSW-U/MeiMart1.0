import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState } from '../../src/components/feedback/EmptyState';
import { useGoBack } from '../../src/hooks/useGoBack';
import { useTranslation } from '../../src/i18n/useTranslation';
import { useOrderStore } from '../../src/store/useOrderStore';
import type { OrderHistoryItem } from '../../src/types/order';

const statusToneMap: Record<OrderHistoryItem['status'], 'history.status.completed' | 'history.status.cancelled' | 'history.status.transferred'> = {
  completed: 'history.status.completed',
  cancelled: 'history.status.cancelled',
  transferred: 'history.status.transferred',
};

const statusColorMap: Record<OrderHistoryItem['status'], { bg: string; text: string }> = {
  completed: { bg: '#dcf5e3', text: '#1f7a3a' },
  cancelled: { bg: '#fde2df', text: '#a3322a' },
  transferred: { bg: '#fff3d6', text: '#a06b00' },
};

const formatDateTime = (timestamp: number) => {
  const d = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatIncome = (income: number, fallback: string) => (income > 0 ? `$${income.toFixed(2)}` : fallback);

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [order, setOrder] = useState<OrderHistoryItem | null | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        const result = await useOrderStore.getState().getById(String(id));
        if (active) setOrder(result);
      };
      void load();
      return () => {
        active = false;
      };
    }, [id]),
  );

  const goBack = useGoBack('/order/history');

  const renderBody = () => {
    if (order === undefined) {
      return null;
    }
    if (order === null) {
      return (
        <View className="px-4 pt-8">
          <EmptyState title={t('order.detail.notFound.title')} description={t('order.detail.notFound.description')} />
        </View>
      );
    }

    const tone = statusColorMap[order.status];

    return (
      <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-md px-4 pb-12 pt-4">
        <View className="mb-4 rounded-2xl border border-[#e1bfba] bg-white p-5 shadow-sm">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-[#261816]">{order.orderNo}</Text>
            <View className="rounded-full px-3 py-1" style={{ backgroundColor: tone.bg }}>
              <Text className="text-xs font-bold" style={{ color: tone.text }}>
                {t(statusToneMap[order.status])}
              </Text>
            </View>
          </View>
          <Text className="mt-3 text-xs text-[#8d706c]">{t('order.detail.completedAt')}</Text>
          <Text className="text-sm font-medium text-[#261816]">{formatDateTime(order.completedAt)}</Text>
        </View>

        <View className="mb-4 rounded-2xl border border-[#e1bfba] bg-white p-5 shadow-sm">
          <View className="mb-4">
            <Text className="text-xs font-bold uppercase tracking-wider text-[#720003]">{t('order.detail.pickup')}</Text>
            <Text className="mt-1 text-base font-bold text-[#261816]">{order.pickupName}</Text>
            <Text className="mt-1 text-sm text-[#59413d]">{order.pickupAddress}</Text>
          </View>
          <View className="h-px bg-[#f7ddd9]" />
          <View className="mt-4">
            <Text className="text-xs font-bold uppercase tracking-wider text-[#720003]">{t('order.detail.dropoff')}</Text>
            <Text className="mt-1 text-base font-bold text-[#261816]">{order.dropoffName}</Text>
            <Text className="mt-1 text-sm text-[#59413d]">{order.dropoffAddress}</Text>
          </View>
        </View>

        <View className="mb-4 flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-[#e1bfba] bg-white p-4 shadow-sm">
            <Text className="text-xs text-[#8d706c]">{t('order.detail.distance')}</Text>
            <Text className="mt-1 text-lg font-bold text-[#261816]">{order.distanceKm.toFixed(1)} km</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-[#e1bfba] bg-white p-4 shadow-sm">
            <Text className="text-xs text-[#8d706c]">{t('order.detail.duration')}</Text>
            <Text className="mt-1 text-lg font-bold text-[#261816]">
              {order.durationMinutes > 0 ? t('order.detail.minutes', { minutes: order.durationMinutes }) : '—'}
            </Text>
          </View>
        </View>

        <View className="rounded-2xl border border-[#720003] bg-[#fff0ee] p-5 shadow-sm">
          <Text className="text-xs font-bold uppercase tracking-wider text-[#720003]">{t('order.detail.income')}</Text>
          <Text className="mt-1 text-2xl font-bold text-[#720003]">{formatIncome(order.income, t('history.noIncome'))}</Text>
        </View>
      </ScrollView>
    );
  };

  return (
    <View className="flex-1 bg-[#fff8f7]">
      <View className="flex-row items-center border-b border-[#f7ddd9] bg-[#fff8f7] px-5 py-4">
        <Pressable className="h-10 w-10 items-center justify-center rounded-full active:bg-[#ffe9e6]" onPress={() => void goBack()}>
          <Text className="text-2xl text-[#261816]">‹</Text>
        </Pressable>
        <Text className="ml-2 text-xl font-semibold text-[#261816]">{t('order.detail.title')}</Text>
      </View>
      {renderBody()}
    </View>
  );
}
