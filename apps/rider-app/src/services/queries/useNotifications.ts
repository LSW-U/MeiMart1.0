import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { NotificationItem } from '@/src/types/notification';

import { notificationApi } from '../notification';

export const notificationsKey = ['notifications', 'list'] as const;
export const unreadCountKey = ['notifications', 'unreadCount'] as const;

export function useNotifications() {
  return useQuery({
    queryKey: notificationsKey,
    queryFn: () => notificationApi.list(),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: unreadCountKey,
    queryFn: () => notificationApi.getUnreadCount(),
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsKey });
      void queryClient.invalidateQueries({ queryKey: unreadCountKey });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsKey });
      void queryClient.invalidateQueries({ queryKey: unreadCountKey });
    },
  });
}

export function useAddNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) =>
      notificationApi.add(input),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsKey });
      void queryClient.invalidateQueries({ queryKey: unreadCountKey });
    },
  });
}
