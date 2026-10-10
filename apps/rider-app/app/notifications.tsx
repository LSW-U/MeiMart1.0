import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppIcon } from '../src/components/ui';
import { ErrorState } from '../src/components/feedback/ErrorState';
import { SimplePageHeader } from '../src/components/layout/SimplePageHeader';
import { showToast } from '../src/components/feedback/Toast';
import { useMinuteTick } from '../src/hooks/useMinuteTick';
import { useTranslation, type TranslationKey } from '../src/i18n/useTranslation';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from '../src/services/queries/useNotifications';
import { colors } from '../src/theme/colors';
import { safeDeepLink } from '../src/utils/safe-deep-link';
import type { NotificationCategory, NotificationItem } from '../src/types/notification';

type FilterKey = 'all' | NotificationCategory;

const filters: {
  key: FilterKey;
  labelKey:
    | 'notification.filter.all'
    | 'notification.filter.task'
    | 'notification.filter.order'
    | 'notification.filter.wallet'
    | 'notification.filter.system';
}[] = [
  { key: 'all', labelKey: 'notification.filter.all' },
  { key: 'task', labelKey: 'notification.filter.task' },
  { key: 'order', labelKey: 'notification.filter.order' },
  { key: 'wallet', labelKey: 'notification.filter.wallet' },
  { key: 'system', labelKey: 'notification.filter.system' },
];

const categoryStyle: Record<
  NotificationCategory,
  { bg: string; icon: 'notification' | 'orders' | 'wallet' | 'settings' }
> = {
  task: { bg: colors.notificationTask, icon: 'notification' },
  order: { bg: colors.notificationOrder, icon: 'orders' },
  wallet: { bg: colors.notificationWallet, icon: 'wallet' },
  system: { bg: colors.notificationSystem, icon: 'settings' },
};

// P4-1 §3.1：loading 骨架卡——复用通知卡布局（圆角 2xl + border + p-4，左侧圆占位 + 右侧两行灰条）
// 收尾批 E-A11Y-1：硬编码 'loading' 改 t()（复用既有 duty.loading，五语已齐，不新增 key）
function NotificationSkeleton() {
  const { t } = useTranslation();
  return (
    <View
      accessibilityRole="none"
      accessibilityLabel={t('duty.loading')}
      testID="notification-skeleton"
    >
      {[0, 1, 2].map((i) => (
        <View
          className="flex-row items-start gap-3 rounded-2xl border border-surface-variant bg-surface p-4"
          key={i}
        >
          <View className="h-9 w-9 rounded-full bg-surface-variant" />
          <View className="flex-1 gap-2">
            <View className="h-4 w-2/3 rounded bg-surface-variant" />
            <View className="h-3 w-full rounded bg-surface-variant" />
            <View className="h-3 w-1/3 rounded bg-surface-variant" />
          </View>
        </View>
      ))}
    </View>
  );
}

// P4-3 §3.3：空态增强——图标 + 标题 + 描述（分类空态文案区分）
function EmptyStateView({
  icon,
  title,
  description,
}: {
  icon: 'notification';
  title: string;
  description: string;
}) {
  return (
    <View className="items-center rounded-3xl bg-surface p-8" testID="notification-empty">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-surface-container-low">
        <AppIcon color={colors.outline} name={icon} size={32} />
      </View>
      <Text className="text-lg font-bold text-on-surface">{title}</Text>
      <Text className="mt-2 text-center text-sm text-on-surface-variant">{description}</Text>
    </View>
  );
}

// D7 批4（R-P3-7）：相对时间叶子组件——tick 状态只落在这里，每分钟仅重渲
// 时间 Text 而非整张通知卡（原页面级 setTick 每分钟全列表重渲染）
function NotificationTimeText({
  timestamp,
  formatTime,
}: {
  timestamp: number;
  formatTime: (t: number) => string;
}) {
  useMinuteTick();
  return <Text className="mt-2 text-xs text-outline">{formatTime(timestamp)}</Text>;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterKey>('all');
  // P4-1 §3.1：取 isLoading/isError/refetch 三态（修 loading 误判空态）
  const { data: items = [], isLoading, isError, refetch } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();

  const visibleItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((item) => item.category === filter);
  }, [items, filter]);

  const formatTime = useCallback(
    (timestamp: number) => {
      const diff = Date.now() - timestamp;
      const minute = 60 * 1000;
      const hour = 60 * minute;
      const day = 24 * hour;
      if (diff < minute) return t('notification.time.justNow');
      if (diff < hour)
        return t('notification.time.minutesAgo', { minutes: Math.floor(diff / minute) });
      if (diff < day) return t('notification.time.hoursAgo', { hours: Math.floor(diff / hour) });
      return t('notification.time.daysAgo', { days: Math.floor(diff / day) });
    },
    [t],
  );

  // P4-2 §3.2：跳转优先，标记已读异步容错——失败 toast 不阻断跳转（依赖数组补 t）
  const onItemPress = useCallback(
    async (item: NotificationItem) => {
      // D8 批4（R-P3-8）：item.link 是服务端字符串，先过白名单校验再 push
      // （非法 link 丢弃不跳，仍走下方标记已读降级）
      if (item.link) {
        const safeLink = safeDeepLink(item.link);
        if (safeLink) router.push(safeLink);
      }
      if (!item.read) {
        try {
          await markAsReadMutation.mutateAsync(item.id);
        } catch {
          // real 模式后端 /notifications 未就绪或网络异常时 mutateAsync throw——不阻断跳转，仅 toast
          showToast(t('notification.error.markFailed'), 'error');
        }
      }
    },
    [router, markAsReadMutation, t],
  );

  // P4-5 §3.5：全部已读 try/catch + 成功/失败 toast（修静默无反馈）
  // P3-审查④ isPending 防护：连点「全部已读」会并发 mutateAsync 堆叠两条 success toast，前置守卫 + 按钮 disabled 双重阻断
  const handleMarkAllRead = async () => {
    if (markAllAsReadMutation.isPending) return;
    try {
      await markAllAsReadMutation.mutateAsync();
      showToast(t('notification.markAllRead.success'), 'success');
    } catch {
      showToast(t('notification.markAllRead.failed'), 'error');
    }
  };

  return (
    <View className="flex-1 bg-background">
      <SimplePageHeader
        action={
          unreadCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('notification.markAllRead')}
              accessibilityState={markAllAsReadMutation.isPending ? { disabled: true } : undefined}
              disabled={markAllAsReadMutation.isPending}
              className="rounded-full bg-surface-container-low px-3 py-1.5 active:bg-surface-blush"
              onPress={() => void handleMarkAllRead()}
            >
              <Text className="text-xs font-bold text-primary">
                {t('notification.markAllRead')}
              </Text>
            </Pressable>
          ) : undefined
        }
        backLabel={t('common.back')}
        title={t('notification.title')}
      />

      <View className="flex-row gap-2 border-b border-surface-variant bg-surface px-5 py-3">
        {filters.map(({ key, labelKey }) => {
          const active = filter === key;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(labelKey)}
              accessibilityState={{ selected: active }}
              key={key}
              className={`flex-1 items-center justify-center rounded-full border px-3 py-2 ${
                active ? 'border-primary bg-primary' : 'border-outline-variant bg-surface'
              }`}
              onPress={() => setFilter(key)}
            >
              <Text
                className={`text-xs font-bold ${active ? 'text-white' : 'text-on-surface-variant'}`}
              >
                {t(labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerClassName="gap-3 px-5 py-4 pb-12">
        {/* P4-1 §3.1：三态分支——loading 骨架优先（不再误判空态闪「暂无通知」），error 重试 */}
        {isLoading ? (
          <NotificationSkeleton />
        ) : isError ? (
          <ErrorState
            actionLabel={t('common.retry')}
            message={t('common.loadError.desc')}
            onAction={() => void refetch()}
            title={t('common.loadError.title')}
          />
        ) : visibleItems.length === 0 ? (
          // P4-3 §3.3：空态增强——图标+标题+描述，分类空态文案区分
          <EmptyStateView
            description={
              filter === 'all' ? t('notification.empty.hint') : t('notification.empty.filtered')
            }
            icon="notification"
            title={t('notification.empty')}
          />
        ) : (
          visibleItems.map((item) => {
            const style = categoryStyle[item.category];
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(item.titleKey as TranslationKey)}
                key={item.id}
                className={`flex-row items-start gap-3 rounded-2xl border p-4 ${item.read ? 'border-blush-border bg-surface' : 'border-outline-variant bg-surface-container-low'}`}
                onPress={() => void onItemPress(item)}
              >
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: style.bg }}
                >
                  <AppIcon color={colors.surface} name={style.icon} size={20} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="flex-1 text-base font-bold text-on-surface" numberOfLines={1}>
                      {t(item.titleKey as TranslationKey)}
                    </Text>
                    {!item.read ? (
                      <View className="ml-2 h-2.5 w-2.5 rounded-full bg-dot-unread" />
                    ) : null}
                  </View>
                  <Text className="mt-1 text-sm leading-5 text-on-surface-variant">
                    {t(item.messageKey as TranslationKey, item.vars)}
                  </Text>
                  <NotificationTimeText formatTime={formatTime} timestamp={item.createdAt} />
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
