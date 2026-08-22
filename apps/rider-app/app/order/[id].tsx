import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { QueryBoundary } from '../../src/components/feedback/QueryBoundary';
import { SimplePageHeader } from '../../src/components/layout/SimplePageHeader';
import { useTranslation } from '../../src/i18n/useTranslation';
import { useOrder } from '../../src/services/queries/useOrder';
import { colors } from '../../src/theme/colors';
import type { OrderHistoryItem } from '../../src/types/order';
import { formatCurrency, formatDistance } from '../../src/utils/format';

const statusToneMap: Record<OrderHistoryItem['status'], 'history.status.completed' | 'history.status.cancelled' | 'history.status.transferred'> = {
  completed: 'history.status.completed',
  cancelled: 'history.status.cancelled',
  transferred: 'history.status.transferred',
};

const statusColorMap: Record<OrderHistoryItem['status'], { bg: string; text: string }> = {
  completed: { bg: colors.statusSuccessBg, text: colors.statusSuccessText },
  cancelled: { bg: colors.statusDangerBg, text: colors.statusDangerText },
  transferred: { bg: colors.statusWarningBg, text: colors.statusWarningText },
};

const formatDateTime = (timestamp: number) => {
  const d = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * 订单详情主体——QueryBoundary 窄化后的非 null 订单数据。
 * E4 §3.1：三态由 QueryBoundary 统一处理（loading 骨架 / error 重试 / null→notFound），
 * 此组件只负责 data 态渲染。
 */
function OrderDetailBody({ order }: { order: OrderHistoryItem }) {
  const { t } = useTranslation();
  const tone = statusColorMap[order.status];

  return (
    <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-md px-4 pb-12 pt-4">
      <View className="mb-4 rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-bold text-on-surface">{order.orderNo}</Text>
          <View className="rounded-full px-3 py-1" style={{ backgroundColor: tone.bg }}>
            <Text className="text-xs font-bold" style={{ color: tone.text }}>
              {t(statusToneMap[order.status])}
            </Text>
          </View>
        </View>
        <Text className="mt-3 text-xs text-outline">{t('order.detail.completedAt')}</Text>
        <Text className="text-sm font-medium text-on-surface">{formatDateTime(order.completedAt)}</Text>
      </View>

      <View className="mb-4 rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
        <View className="mb-4">
          <Text className="text-xs font-bold uppercase tracking-wider text-primary">{t('order.detail.pickup')}</Text>
          <Text className="mt-1 text-base font-bold text-on-surface">{order.pickupName}</Text>
          <Text className="mt-1 text-sm text-on-surface-variant">{order.pickupAddress}</Text>
        </View>
        <View className="h-px bg-surface-variant" />
        <View className="mt-4">
          <Text className="text-xs font-bold uppercase tracking-wider text-primary">{t('order.detail.dropoff')}</Text>
          <Text className="mt-1 text-base font-bold text-on-surface">{order.dropoffName}</Text>
          <Text className="mt-1 text-sm text-on-surface-variant">{order.dropoffAddress}</Text>
        </View>
      </View>

      <View className="mb-4 flex-row gap-3">
        <View className="flex-1 rounded-2xl border border-outline-variant bg-surface p-4 shadow-sm">
          <Text className="text-xs text-outline">{t('order.detail.distance')}</Text>
          <Text className="mt-1 text-lg font-bold text-on-surface">{formatDistance(order.distanceKm)}</Text>
        </View>
        <View className="flex-1 rounded-2xl border border-outline-variant bg-surface p-4 shadow-sm">
          <Text className="text-xs text-outline">{t('order.detail.duration')}</Text>
          <Text className="mt-1 text-lg font-bold text-on-surface">
            {order.durationMinutes > 0 ? t('order.detail.minutes', { minutes: order.durationMinutes }) : '—'}
          </Text>
        </View>
      </View>

      <View className="rounded-2xl border border-primary bg-surface-container-low p-5 shadow-sm">
        <Text className="text-xs font-bold uppercase tracking-wider text-primary">{t('order.detail.income')}</Text>
        <Text className="mt-1 text-2xl font-bold text-primary">{order.income > 0 ? formatCurrency(order.income, t('common.currency')) : t('history.noIncome')}</Text>
      </View>
    </ScrollView>
  );
}

export default function OrderDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  // E4 §2.3: 补 isError/refetch 解构——useOrder 是标准 useQuery 已暴露三态字段，无需改 hook。
  const { data: order, isLoading, isError, refetch } = useOrder(id);

  return (
    <View className="flex-1 bg-background">
      {/* E4 §3.4: 页头统一为 SimplePageHeader（对齐 B4 已落地 7 处辅助页，chevronLeft AppIcon + h-16 定高），
          useGoBack 由组件内部调用，fallbackHref=/order/history */}
      <SimplePageHeader
        title={t('order.detail.title')}
        backLabel={t('common.back')}
        fallbackHref="/order/history"
      />
      <View className="flex-1 px-4 pt-4">
        {/* E4 §3.1/§3.2: QueryBoundary 统一三态——
            loading→detail 骨架（1 大块 h-30 + 3 行，4 卡轮廓占位，不再白屏）
            isError||data===undefined→ErrorState+重试（复用 common.loadError.*，对齐 task/[id].tsx）
            data===null→notFound 空态（getById 业务返回 null，无重试按钮） */}
        <QueryBoundary<OrderHistoryItem | null, OrderHistoryItem>
          data={order}
          isLoading={isLoading}
          isError={isError}
          isEmpty={(value) => value === null}
          errorTitle={t('common.loadError.title')}
          errorMessage={t('common.loadError.desc')}
          retryLabel={t('common.retry')}
          emptyTitle={t('order.detail.notFound.title')}
          emptyDescription={t('order.detail.notFound.description')}
          skeleton="detail"
          onRetry={() => void refetch()}
        >
          {(detail) => <OrderDetailBody order={detail} />}
        </QueryBoundary>
      </View>
    </View>
  );
}
