import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { notificationsApi, type NotificationPreferences } from '@/services/notifications';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { getApiErrorMessage } from '@/utils/error';
import type { Notification } from '@/types';
import {
  STALE_TIME,
  NOTIFICATIONS_QUERY_KEY,
  UNREAD_COUNT_QUERY_KEY,
  notificationsListKey,
  NOTIFICATION_PREFS_KEY,
} from '@/lib/queryKeys';

// key 定义集中迁 @/lib/queryKeys（批1 收编）；re-export 保持调用方 import 路径不变。
// 语义注解（原位保留）：列表 key 派生自 NOTIFICATIONS_QUERY_KEY 加 'all'/'unread' 后缀，
// 必须显式常量不能用纯前缀 setQueriesData —— UNREAD_COUNT_QUERY_KEY 共享同一前缀，
// 纯前缀匹配会把 number 未读数喂给 .map() 崩溃；key 已去 locale 段（批1 A4 透传）。
export {
  NOTIFICATIONS_QUERY_KEY,
  UNREAD_COUNT_QUERY_KEY,
  notificationsListKey,
  NOTIFICATION_PREFS_KEY,
} from '@/lib/queryKeys';

// Why: 从 useUser.ts 拆出来，notifications 模块自包含（service + hook 都在）
// 同时新增 useUnreadCount（首页 badge）+ useMarkAllNotificationsRead（消息中心一键已读）

interface NotificationSnapshot {
  all?: Notification[];
  unread?: Notification[];
  count?: number;
}

// Why: snapshot/restore 逐精确 key 收集（key 已去 locale，两列表 + 未读数可静态枚举）；
//      undefined 的条目还原时跳过，避免误清尚未加载的 query
function snapshotNotifications(qc: QueryClient): NotificationSnapshot {
  return {
    all: qc.getQueryData<Notification[]>(notificationsListKey(false)),
    unread: qc.getQueryData<Notification[]>(notificationsListKey(true)),
    count: qc.getQueryData<number>(UNREAD_COUNT_QUERY_KEY),
  };
}

function restoreNotificationSnapshot(qc: QueryClient, snap: NotificationSnapshot | undefined) {
  if (!snap) return;
  if (snap.all !== undefined) qc.setQueryData(notificationsListKey(false), snap.all);
  if (snap.unread !== undefined) qc.setQueryData(notificationsListKey(true), snap.unread);
  if (typeof snap.count === 'number') qc.setQueryData(UNREAD_COUNT_QUERY_KEY, snap.count);
}

export function useNotifications(onlyUnread = false) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: notificationsListKey(onlyUnread),
    queryFn: () => notificationsApi.list(onlyUnread),
    staleTime: STALE_TIME.notifications,
    networkMode: 'offlineFirst',
    enabled: isAuthenticated, // 未登录时不请求
  });
}

export function useUnreadCount() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: UNREAD_COUNT_QUERY_KEY,
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: STALE_TIME.notifications,
    networkMode: 'offlineFirst',
    enabled: isAuthenticated, // 未登录时不请求
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      const previous = snapshotNotifications(qc);
      // Why: all 列表标记 read=true；unread 列表按契约（仅未读，服务端 list(true) 过滤）移除已读项
      if (previous.all) {
        qc.setQueryData<Notification[]>(notificationsListKey(false), (old) =>
          old ? old.map((n) => (n.id === id ? { ...n, read: true } : n)) : old,
        );
      }
      if (previous.unread) {
        qc.setQueryData<Notification[]>(notificationsListKey(true), (old) =>
          old ? old.filter((n) => n.id !== id) : old,
        );
      }
      // Why: 标记已读后未读数 -1（乐观），等 invalidate 校准
      if (typeof previous.count === 'number') {
        qc.setQueryData(UNREAD_COUNT_QUERY_KEY, Math.max(0, previous.count - 1));
      }
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      restoreNotificationSnapshot(qc, ctx?.previous);
    },
    onSettled: () => {
      // Why: 前缀 invalidate 同时覆盖 all / unread 列表（各语言）+ unread-count
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      const previous = snapshotNotifications(qc);
      // Why: all 列表全部标记 read；unread 列表清空（契约：仅未读）
      if (previous.all) {
        qc.setQueryData<Notification[]>(notificationsListKey(false), (old) =>
          old ? old.map((n) => ({ ...n, read: true })) : old,
        );
      }
      if (previous.unread) {
        qc.setQueryData<Notification[]>(notificationsListKey(true), []);
      }
      if (typeof previous.count === 'number') {
        qc.setQueryData(UNREAD_COUNT_QUERY_KEY, 0);
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      restoreNotificationSnapshot(qc, ctx?.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}

// ============================================================================
// 批2（#3 通知管理）：删除通知（单条/批量）——乐观移除 + snapshot/restore 回滚
// ============================================================================

// Why: 单条/批量共用同一乐观管线（ids 数组统一入参，单条=长度 1）：
//      all/unread 两列表过滤删除；未读数按删除项中未读条数递减（删已读不动计数）。
//      snapshot/restore 复用上方基建（与 markRead onMutate 同构）。
export function useDeleteNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => notificationsApi.deleteNotifications(ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      const previous = snapshotNotifications(qc);
      const set = new Set(ids);
      if (previous.all) {
        qc.setQueryData<Notification[]>(notificationsListKey(false), (old) =>
          old ? old.filter((n) => !set.has(n.id)) : old,
        );
      }
      if (previous.unread) {
        qc.setQueryData<Notification[]>(notificationsListKey(true), (old) =>
          old ? old.filter((n) => !set.has(n.id)) : old,
        );
      }
      if (typeof previous.count === 'number') {
        const deletedUnread = (previous.all ?? []).filter((n) => set.has(n.id) && !n.read).length;
        qc.setQueryData(UNREAD_COUNT_QUERY_KEY, Math.max(0, previous.count - deletedUnread));
      }
      return { previous };
    },
    onError: (_err, _ids, ctx) => {
      restoreNotificationSnapshot(qc, ctx?.previous);
    },
    onSettled: () => {
      // 前缀 invalidate 覆盖 all/unread 列表 + unread-count，服务端真值校准
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}

// ============================================================================
// P17-B1 通知偏好（后端 b8ccfb9）：GET 全量三布尔 + PATCH 部分更新（乐观三件套）
// ============================================================================

// Why: 与 NOTIFICATIONS_QUERY_KEY（['user','notifications']）前缀不同，互不误伤
//      （后端列表/未读数按偏好过滤是副作用，更新偏好后主动 invalidate 列表前缀）

export function useNotificationPreferences() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: NOTIFICATION_PREFS_KEY,
    queryFn: () => notificationsApi.getPreferences(),
    staleTime: STALE_TIME.notificationPrefs,
    networkMode: 'offlineFirst',
    enabled: isAuthenticated, // 未登录时不请求
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (patch: Partial<NotificationPreferences>) =>
      notificationsApi.updatePreferences(patch),
    // 规则 25：开关拨动必须立即视觉反馈
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: NOTIFICATION_PREFS_KEY });
      const previous = qc.getQueryData<NotificationPreferences>(NOTIFICATION_PREFS_KEY);
      if (previous) {
        qc.setQueryData(NOTIFICATION_PREFS_KEY, { ...previous, ...patch });
      }
      return { previous };
    },
    onError: (error, _patch, ctx) => {
      // 回滚开关位置 + toast 提示（页面层不重复 toast）
      if (ctx?.previous) qc.setQueryData(NOTIFICATION_PREFS_KEY, ctx.previous);
      toast.error(
        getApiErrorMessage(
          error,
          t('settings.notifUpdateFailed', { defaultValue: 'Failed to update preferences' }),
        ),
      );
    },
    onSuccess: (next) => {
      // 后端返回全量，直接对齐（纠正乐观 merge 可能的偏差）
      qc.setQueryData(NOTIFICATION_PREFS_KEY, next);
      // ⚠️ 列表/未读数已按新偏好过滤（后端副作用），本地缓存立即失效重查。
      // 前缀匹配同时命中 all/unread 列表 + unread-count 三个 key
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}
