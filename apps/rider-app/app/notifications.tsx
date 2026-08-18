import { useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppIcon } from '../src/components/ui';
import { EmptyState } from '../src/components/feedback/EmptyState';
import { SimplePageHeader } from '../src/components/layout/SimplePageHeader';
import { useTranslation, type TranslationKey } from '../src/i18n/useTranslation';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from '../src/services/queries/useNotifications';
import { colors } from '../src/theme/colors';
import type { NotificationCategory, NotificationItem } from '../src/types/notification';

type FilterKey = 'all' | NotificationCategory;

const filters: { key: FilterKey; labelKey: 'notification.filter.all' | 'notification.filter.task' | 'notification.filter.order' | 'notification.filter.wallet' | 'notification.filter.system' }[] = [
  { key: 'all', labelKey: 'notification.filter.all' },
  { key: 'task', labelKey: 'notification.filter.task' },
  { key: 'order', labelKey: 'notification.filter.order' },
  { key: 'wallet', labelKey: 'notification.filter.wallet' },
  { key: 'system', labelKey: 'notification.filter.system' },
];

const categoryStyle: Record<NotificationCategory, { bg: string; icon: 'notification' | 'orders' | 'wallet' | 'settings' }> = {
  task: { bg: colors.notificationTask, icon: 'notification' },
  order: { bg: colors.notificationOrder, icon: 'orders' },
  wallet: { bg: colors.notificationWallet, icon: 'wallet' },
  system: { bg: colors.notificationSystem, icon: 'settings' },
};

export default function NotificationsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterKey>('all');
  const { data: items = [] } = useNotifications();
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
      if (diff < hour) return t('notification.time.minutesAgo', { minutes: Math.floor(diff / minute) });
      if (diff < day) return t('notification.time.hoursAgo', { hours: Math.floor(diff / hour) });
      return t('notification.time.daysAgo', { days: Math.floor(diff / day) });
    },
    [t],
  );

  const onItemPress = useCallback(
    async (item: NotificationItem) => {
      if (!item.read) await markAsReadMutation.mutateAsync(item.id);
      // item.link 是后端/mock 返回的动态路由 string（/(main)/earnings、/order/{id}），
      // expo-router typed routes 无法静态窄化 runtime string，断言为 Href（合法路由联合）
      if (item.link) router.push(item.link as Href);
    },
    [router, markAsReadMutation],
  );

  const handleMarkAllRead = async () => {
    await markAllAsReadMutation.mutateAsync();
  };

  return (
    <View className="flex-1 bg-surface">
      <SimplePageHeader
        action={
          unreadCount > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t('notification.markAllRead')} className="rounded-full bg-surface-container-low px-3 py-1.5 active:bg-surface-blush" onPress={() => void handleMarkAllRead()}>
              <Text className="text-xs font-bold text-primary">{t('notification.markAllRead')}</Text>
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
                active ? 'border-primary bg-primary' : 'border-outline-variant bg-white'
              }`}
              onPress={() => setFilter(key)}
            >
              <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-on-surface-variant'}`}>
                {t(labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerClassName="gap-3 px-5 py-4 pb-12">
        {visibleItems.length === 0 ? (
          <EmptyState title={t('notification.empty')} />
        ) : (
          visibleItems.map((item) => {
            const style = categoryStyle[item.category];
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(item.titleKey as TranslationKey)}
                key={item.id}
                className={`flex-row items-start gap-3 rounded-2xl border p-4 ${item.read ? 'border-blush-border bg-white' : 'border-outline-variant bg-surface-container-low'}`}
                onPress={() => void onItemPress(item)}
              >
                <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: style.bg }}>
                  <AppIcon color={colors.surface} name={style.icon} size={20} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="flex-1 text-base font-bold text-on-surface" numberOfLines={1}>
                      {t(item.titleKey as TranslationKey)}
                    </Text>
                    {!item.read ? <View className="ml-2 h-2.5 w-2.5 rounded-full bg-dot-unread" /> : null}
                  </View>
                  <Text className="mt-1 text-sm leading-5 text-on-surface-variant">
                    {t(item.messageKey as TranslationKey, item.vars)}
                  </Text>
                  <Text className="mt-2 text-xs text-outline">{formatTime(item.createdAt)}</Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
