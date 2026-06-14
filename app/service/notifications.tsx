import {
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  Text,
  Pressable,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
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
        title="消息通知"
        showBack
        onBackPress={() => router.back()}
        rightAction={
          unreadCount > 0 ? (
            <Button
              label="全部已读"
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
        <ErrorState message="加载通知失败" onRetry={() => refetch()} />
      ) : !notifications || notifications.length === 0 ? (
        <EmptyState title="暂无通知" description="新消息会显示在这里" icon="bell-off-outline" />
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

void Text;
void Pressable;
void Alert;
