import { StyleSheet, View, FlatList, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { NotificationItem } from '@/components/business/NotificationItem';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { useNotifications, useMarkNotificationRead } from '@/services/queries/useUser';
import type { Notification } from '@/types';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data: notifications, isLoading, isError, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  const markAllRead = () => {
    notifications?.forEach((n) => {
      if (!n.read) markRead.mutate(n.id);
    });
  };

  const onPress = (item: Notification) => {
    if (!item.read) markRead.mutate(item.id);
    if (item.type === 'order') {
      router.push('/(main)/orders');
    }
  };

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader
        title={t('service.notifications.title')}
        showBack
        onBackPress={() => router.back()}
        rightAction={
          unreadCount > 0 ? (
            <Button
              label={t('service.notifications.readAll')}
              variant="text"
              size="sm"
              onPress={markAllRead}
              testID="notif-read-all"
            />
          ) : undefined
        }
      />
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <ErrorState message={t('errors.notifications')} onRetry={() => refetch()} />
      ) : !notifications || notifications.length === 0 ? (
        <EmptyState
          title={t('service.notifications.empty')}
          description={t('service.notifications.emptyDesc')}
          icon="bell-off-outline"
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <NotificationItem notification={item} onPress={() => onPress(item)} />
          )}
        />
      )}
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
