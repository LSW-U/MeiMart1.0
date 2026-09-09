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

// 批C C2：已读闭环补 onMutate 三件套（对齐 client-app 规则 25 标准——用户点击后
// 红点/列表必须立即反馈，不等网络往返；失败回滚快照）。
export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationsKey });
      await queryClient.cancelQueries({ queryKey: unreadCountKey });
      const previousList = queryClient.getQueryData<NotificationItem[]>(notificationsKey);
      const previousCount = queryClient.getQueryData<number>(unreadCountKey);
      if (previousList) {
        const target = previousList.find((item) => item.id === id);
        // 乐观写列表：目标项置已读；仅当目标原本未读时未读数才 -1（幂等不重复扣）
        queryClient.setQueryData<NotificationItem[]>(
          notificationsKey,
          previousList.map((item) => (item.id === id ? { ...item, read: true } : item)),
        );
        if (typeof previousCount === 'number' && target && !target.read) {
          queryClient.setQueryData(unreadCountKey, Math.max(0, previousCount - 1));
        }
      }
      return { previousList, previousCount };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previousList) queryClient.setQueryData(notificationsKey, ctx.previousList);
      if (typeof ctx?.previousCount === 'number') {
        queryClient.setQueryData(unreadCountKey, ctx.previousCount);
      }
    },
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
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationsKey });
      await queryClient.cancelQueries({ queryKey: unreadCountKey });
      const previousList = queryClient.getQueryData<NotificationItem[]>(notificationsKey);
      const previousCount = queryClient.getQueryData<number>(unreadCountKey);
      if (previousList) {
        queryClient.setQueryData<NotificationItem[]>(
          notificationsKey,
          previousList.map((item) => ({ ...item, read: true })),
        );
      }
      queryClient.setQueryData(unreadCountKey, 0);
      return { previousList, previousCount };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousList) queryClient.setQueryData(notificationsKey, ctx.previousList);
      if (typeof ctx?.previousCount === 'number') {
        queryClient.setQueryData(unreadCountKey, ctx.previousCount);
      }
    },
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
