import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/services/notifications';
import type { Notification } from '@/types';

// Why: 从 useUser.ts 拆出来，notifications 模块自包含（service + hook 都在）
// 同时新增 useUnreadCount（首页 badge）+ useMarkAllNotificationsRead（消息中心一键已读）
export const NOTIFICATIONS_QUERY_KEY = ['user', 'notifications'] as const;
export const UNREAD_COUNT_QUERY_KEY = ['user', 'notifications', 'unread-count'] as const;

export function useNotifications(onlyUnread = false) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, onlyUnread ? 'unread' : 'all'],
    queryFn: () => notificationsApi.list(onlyUnread),
    staleTime: 30 * 1000,
    networkMode: 'offlineFirst',
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: UNREAD_COUNT_QUERY_KEY,
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: 30 * 1000,
    networkMode: 'offlineFirst',
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      const previous = qc.getQueryData<Notification[]>(NOTIFICATIONS_QUERY_KEY);
      qc.setQueryData<Notification[]>(NOTIFICATIONS_QUERY_KEY, (old) => {
        if (!old) return old;
        return old.map((n) => (n.id === id ? { ...n, read: true } : n));
      });
      // Why: 标记已读后未读数 -1（乐观），等 invalidate 校准
      const prevCount = qc.getQueryData<number>(UNREAD_COUNT_QUERY_KEY);
      if (typeof prevCount === 'number') {
        qc.setQueryData(UNREAD_COUNT_QUERY_KEY, Math.max(0, prevCount - 1));
      }
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(NOTIFICATIONS_QUERY_KEY, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      const previous = qc.getQueryData<Notification[]>(NOTIFICATIONS_QUERY_KEY);
      qc.setQueryData<Notification[]>(NOTIFICATIONS_QUERY_KEY, (old) => {
        if (!old) return old;
        return old.map((n) => ({ ...n, read: true }));
      });
      qc.setQueryData(UNREAD_COUNT_QUERY_KEY, 0);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(NOTIFICATIONS_QUERY_KEY, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
    },
  });
}
