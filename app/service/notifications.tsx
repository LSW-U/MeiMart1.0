// ⚠️ 无 HTML 原型，参考 OrderListPage 推导实现，待设计确认
// NotificationListPage — 消息列表（参考 OrderListPage.html 的 Tab 栏 + 卡片列表）
// D.10: PrimaryHeader + Tab 栏 + 通知卡片列表 + 已读/未读样式
import { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { NotificationItem } from '@/components/business/NotificationItem';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { useNotifications, useMarkNotificationRead } from '@/services/queries/useUser';
import type { Notification } from '@/types';

type TabKey = 'all' | 'order' | 'promotion' | 'system';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [tab, setTab] = useState<TabKey>('all');
  const { data: notifications, isLoading, isError, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  const filtered = useMemo(() => {
    if (!notifications) return [];
    if (tab === 'all') return notifications;
    return notifications.filter((n) => n.type === tab);
  }, [notifications, tab]);

  const tabUnread: Record<TabKey, number> = {
    all: unreadCount,
    order: notifications?.filter((n) => !n.read && n.type === 'order').length ?? 0,
    promotion: notifications?.filter((n) => !n.read && n.type === 'promotion').length ?? 0,
    system: notifications?.filter((n) => !n.read && n.type === 'system').length ?? 0,
  };

  const markAllRead = () => {
    notifications?.forEach((n) => {
      if (!n.read) markRead.mutate(n.id);
    });
  };

  const onPress = (item: Notification) => {
    if (!item.read) markRead.mutate(item.id);
    if (item.type === 'order') {
      router.push('/(main)/orders');
    } else if (item.type === 'promotion') {
      router.push('/coupons');
    }
  };

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'all', label: t('service.notifications.tabAll', { defaultValue: 'All' }) },
    { key: 'order', label: t('service.notifications.tabOrder', { defaultValue: 'Orders' }) },
    {
      key: 'promotion',
      label: t('service.notifications.tabPromo', { defaultValue: 'Promotions' }),
    },
    { key: 'system', label: t('service.notifications.tabSystem', { defaultValue: 'System' }) },
  ];

  return (
    <SafeAreaWrapper edges={['bottom']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBarConfig />
      <PrimaryHeader
        title={t('service.notifications.title')}
        showBack
        onBackPress={() => router.back()}
        rightActions={
          unreadCount > 0 ? (
            <Pressable
              onPress={markAllRead}
              hitSlop={8}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel={t('service.notifications.readAll')}
              testID="notif-read-all"
            >
              <Icon symbol="check_circle" size={22} color="#ffffff" />
              <View style={[styles.readAllBadge, { backgroundColor: '#ffffff' }]}>
                <Text style={[styles.readAllBadgeText, { color: colors.primary }]}>
                  {unreadCount}
                </Text>
              </View>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push('/settings')}
              hitSlop={8}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel="Notification settings"
            >
              <Icon symbol="settings" size={22} color="#ffffff" />
            </Pressable>
          )
        }
      />

      {/* Tab 栏（参考 orders.tsx 的 Tab 实现） */}
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
            {TABS.map((tabItem) => {
              const isActive = tabItem.key === tab;
              const badge = tabUnread[tabItem.key];
              return (
                <Pressable
                  key={tabItem.key}
                  onPress={() => setTab(tabItem.key)}
                  style={styles.tabBtn}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={tabItem.label}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: isActive ? colors.primary : colors['on-surface-variant'],
                      },
                    ]}
                  >
                    {tabItem.label}
                  </Text>
                  {badge > 0 && (
                    <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.tabBadgeText}>{badge}</Text>
                    </View>
                  )}
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
        <ErrorState message={t('errors.notifications')} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t('service.notifications.empty')}
          description={t('service.notifications.emptyDesc')}
          icon="bell-outline"
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <NotificationItem notification={item} onPress={() => onPress(item)} />
          )}
        />
      )}
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readAllBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readAllBadgeText: {
    fontSize: 9,
    fontWeight: '700',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 4,
  },
  tabText: {
    ...typography['label-caps'],
    fontSize: 13,
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
    color: '#ffffff',
    fontSize: 9,
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
    padding: spacing['container-margin'],
    paddingBottom: spacing.xxl * 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
