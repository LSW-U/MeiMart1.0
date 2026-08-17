import { api, isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import { getCurrentLocale } from '@/i18n';
import type { Notification, NotificationType } from '@/types';

// Why: 后端 Notification 字段名/类型与前端有差异（多语言 Json、type 大写枚举、isRead vs read），service 层做转换避免改组件代码。
interface NotificationRaw {
  id: string;
  userId: string;
  type: string; // 'ORDER_UPDATE' | 'PROMOTION' | 'SYSTEM'（后端大写枚举）
  title: Record<string, string>;
  content: Record<string, string>;
  isRead: boolean;
  data: Record<string, unknown> | null;
  createdAt: string;
}

// Why: 后端 type 大写枚举 → 前端 NotificationType 小写（保持组件 0 改动）
const TYPE_MAP: Record<string, NotificationType> = {
  ORDER_UPDATE: 'order',
  PROMOTION: 'promotion',
  SYSTEM: 'system',
};

function pickLocalized(raw: Record<string, string> | null | undefined, fallback = ''): string {
  if (!raw) return fallback;
  const locale = getCurrentLocale();
  return raw[locale] ?? raw.en ?? raw.zh ?? Object.values(raw)[0] ?? fallback;
}

function transformNotification(raw: NotificationRaw): Notification {
  return {
    id: raw.id,
    title: pickLocalized(raw.title),
    body: pickLocalized(raw.content),
    type: TYPE_MAP[raw.type] ?? 'system',
    read: raw.isRead,
    createdAt: raw.createdAt,
  };
}

// P17-B1 通知偏好（后端 b8ccfb9）：三分类开关，与后端 NotificationType 三值对应。
// 后端 null/缺省兜底全 true；PATCH 部分更新（契约 refine 至少一键）返回更新后全量。
export interface NotificationPreferences {
  /** ORDER_UPDATE 类通知开关 */
  orderUpdates: boolean;
  /** PROMOTION 类通知开关 */
  promotions: boolean;
  /** SYSTEM 类通知开关 */
  system: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = { orderUpdates: true, promotions: true, system: true };

// Why: mock 偏好用模块级变量模拟（决策 3）——会话级 UI 态不进 mockDb（落盘无意义且要写迁移）
let mockPrefs: NotificationPreferences = { ...DEFAULT_PREFS };

export const notificationsApi = {
  async list(onlyUnread = false): Promise<Notification[]> {
    if (isMockMode) {
      const filtered = onlyUnread ? mockDb.notifications.filter((n) => !n.read) : mockDb.notifications;
      return mockResponse(filtered);
    }
    const res = await api.get<NotificationRaw[]>('/client/notifications', {
      params: onlyUnread ? { onlyUnread: 'true' } : undefined,
    });
    return res.data.map(transformNotification);
  },

  async getUnreadCount(): Promise<number> {
    if (isMockMode) {
      const count = mockDb.notifications.filter((n) => !n.read).length;
      return mockResponse(count);
    }
    const res = await api.get<{ count: number }>('/client/notifications/unread-count');
    return res.data.count;
  },

  // Why: 后端 markRead 是 PATCH（不是 POST，user.controller.ts:178 验证）
  async markRead(id: string): Promise<{ success: boolean }> {
    if (isMockMode) {
      const n = mockDb.notifications.find((item) => item.id === id);
      if (n) n.read = true;
      return mockResponse({ success: true });
    }
    const res = await api.patch<{ success: boolean }>(`/client/notifications/${id}/read`);
    return res.data;
  },

  // Why: markAllRead 是 POST /read-all（不带 id）
  async markAllRead(): Promise<{ success: boolean }> {
    if (isMockMode) {
      mockDb.notifications.forEach((n) => (n.read = true));
      return mockResponse({ success: true });
    }
    const res = await api.post<{ success: boolean }>('/client/notifications/read-all');
    return res.data;
  },

  // P17-B1：读取通知偏好（后端 GET 全量三布尔）
  async getPreferences(): Promise<NotificationPreferences> {
    if (isMockMode) return mockResponse({ ...mockPrefs });
    const res = await api.get<NotificationPreferences>('/client/user/notification-preferences');
    return res.data;
  },

  // P17-B1：部分更新偏好（merge 未传 key 不变；mock 侧同步 merge 语义）
  async updatePreferences(
    patch: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    if (isMockMode) {
      mockPrefs = { ...mockPrefs, ...patch };
      return mockResponse({ ...mockPrefs });
    }
    const res = await api.patch<NotificationPreferences>(
      '/client/user/notification-preferences',
      patch,
    );
    return res.data;
  },
};
