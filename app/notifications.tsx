import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppIcon } from '../src/components/ui';
import { EmptyState } from '../src/components/feedback/EmptyState';
import { useGoBack } from '../src/hooks/useGoBack';
import { useTranslation } from '../src/i18n/useTranslation';
import { useNotificationStore } from '../src/store/useNotificationStore';
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
  task: { bg: '#ff9800', icon: 'notification' },
  order: { bg: '#1976d2', icon: 'orders' },
  wallet: { bg: '#388e3c', icon: 'wallet' },
  system: { bg: '#8d706c', icon: 'settings' },
};

export default function NotificationsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterKey>('all');
  const items = useNotificationStore((s) => s.items);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const hydrate = useNotificationStore((s) => s.hydrate);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    void hydrate().then((fn) => { unsub = fn; });
    return () => { unsub?.(); };
  }, [hydrate]);

  const goBack = useGoBack('/(main)/tasks');

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
      if (!item.read) await markRead(item.id);
      if (item.link) router.push(item.link as never);
    },
    [router, markRead],
  );

  return (
    <View className="flex-1 bg-[#fff8f7]">
      <View className="flex-row items-center justify-between border-b border-[#f7ddd9] bg-[#fff8f7] px-5 py-4">
        <View className="flex-row items-center">
          <Pressable className="h-10 w-10 items-center justify-center rounded-full active:bg-[#ffe9e6]" onPress={() => void goBack()}>
            <Text className="text-2xl text-[#261816]">‹</Text>
          </Pressable>
          <Text className="ml-2 text-xl font-semibold text-[#261816]">{t('notification.title')}</Text>
        </View>
        {unreadCount > 0 ? (
          <Pressable className="rounded-full bg-[#fff0ee] px-3 py-1.5 active:bg-[#ffe1dc]" onPress={() => void markAllRead()}>
            <Text className="text-xs font-bold text-[#720003]">{t('notification.markAllRead')}</Text>
          </Pressable>
        ) : null}
      </View>

      <View className="flex-row gap-2 border-b border-[#f7ddd9] bg-[#fff8f7] px-5 py-3">
        {filters.map(({ key, labelKey }) => {
          const active = filter === key;
          return (
            <Pressable
              key={key}
              className={`flex-1 items-center justify-center rounded-full border px-3 py-2 ${
                active ? 'border-[#720003] bg-[#720003]' : 'border-[#e1bfba] bg-white'
              }`}
              onPress={() => setFilter(key)}
            >
              <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-[#59413d]'}`}>
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
                key={item.id}
                className={`flex-row items-start gap-3 rounded-2xl border p-4 ${item.read ? 'border-[#f1d4cf] bg-white' : 'border-[#e1bfba] bg-[#fff0ee]'}`}
                onPress={() => void onItemPress(item)}
              >
                <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: style.bg }}>
                  <AppIcon color="#ffffff" name={style.icon} size={20} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="flex-1 text-base font-bold text-[#261816]" numberOfLines={1}>
                      {t(item.titleKey as never)}
                    </Text>
                    {!item.read ? <View className="ml-2 h-2.5 w-2.5 rounded-full bg-[#ff4d4f]" /> : null}
                  </View>
                  <Text className="mt-1 text-sm leading-5 text-[#59413d]">
                    {t(item.messageKey as never, item.vars)}
                  </Text>
                  <Text className="mt-2 text-xs text-[#8d706c]">{formatTime(item.createdAt)}</Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
