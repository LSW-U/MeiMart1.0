import type { NotificationItem, NotificationCategory } from '@/src/types/notification';

import { api, isMockMode } from './api';
import { riderSettingsApi } from './settings';

// ── 后端契约层（批C C1：isMockMode 开关接入，真模式走 /rider/notifications 四端点） ──

// 后端 Notification.type 大写枚举（批A A3 扩 RIDER_TASK/WALLET）→ 前端 category 小写
const CATEGORY_MAP: Record<string, NotificationCategory> = {
  RIDER_TASK: 'task',
  ORDER_UPDATE: 'order',
  WALLET: 'wallet',
  SYSTEM: 'system',
};

// 后端列表项（/rider/notifications 响应，与 client /notifications 同构）
interface NotificationRaw {
  id: string;
  userId: string;
  type: string;
  title: Record<string, string>;
  content: Record<string, string>;
  isRead: boolean;
  data: Record<string, unknown> | null;
  createdAt: string;
}

// 多语言 pick：当前语言 → en → zh → 首值（方案v2 §3.5 rider，对齐 client-app pickLocalized 语义）
// 当前语言从本地设置取（settings.ts：real 模式 language 也是本地存储，同步读取不落网络）
function currentLanguage(): string {
  try {
    // riderSettingsApi 同步 mock 读（localStorage），real 模式读同一份本地 language
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('mei-delivery-app:rider-settings');
      if (stored) {
        const parsed = JSON.parse(stored) as { language?: string };
        if (parsed.language) return parsed.language;
      }
    }
  } catch {
    // fallthrough to en
  }
  return 'en';
}

function pickLocalized(raw: Record<string, string> | null | undefined): string {
  if (!raw) return '';
  const locale = currentLanguage();
  return raw[locale] ?? raw.en ?? raw.zh ?? Object.values(raw)[0] ?? '';
}

// data 透传键（方案v2 §3.5：taskId/orderId/amount/withdrawId）
const DATA_KEYS = [
  'taskId',
  'orderId',
  'amount',
  'withdrawId',
  'settlementId',
  'status',
  'reason',
] as const;

function transformNotification(raw: NotificationRaw): NotificationItem {
  const data = raw.data ?? {};
  const vars: Record<string, string | number> = {};
  for (const key of DATA_KEYS) {
    const value = data[key];
    if (typeof value === 'string' || typeof value === 'number') {
      vars[key] = value;
    }
  }
  return {
    id: raw.id,
    category: CATEGORY_MAP[raw.type] ?? 'system',
    // 后端返回的是多语言原文（非 i18n key）——沿用 NotificationItem 字段名，值换烘焙文本，
    // 页面 t(titleKey) 对普通文本是恒等回退（useTranslation 字典 miss 回退原串），零组件改动
    titleKey: pickLocalized(raw.title),
    messageKey: pickLocalized(raw.content),
    vars,
    createdAt: new Date(raw.createdAt).getTime(),
    read: raw.isRead,
    // 深链 link 由 data 推导（对齐 mock link 语义，勿丢钱包深链）
    link: deriveLink(CATEGORY_MAP[raw.type] ?? 'system', data),
  };
}

// 深链推导：task→/(main)/tasks、order→/order/:id、wallet→/(main)/earnings（方案v2 §3.5 rider）
function deriveLink(
  category: NotificationCategory,
  data: Record<string, unknown>,
): string | undefined {
  const orderId = typeof data.orderId === 'string' ? data.orderId : undefined;
  switch (category) {
    case 'task':
      return '/(main)/tasks';
    case 'order':
      return orderId ? `/order/${orderId}` : '/order/history';
    case 'wallet':
      return '/(main)/earnings';
    default:
      return undefined;
  }
}

// ── Mock layer (localStorage for Web dev) ──────────────────────────

const storageKey = 'mei-delivery-app:notifications:v2';

const minute = 60 * 1000;
const hour = 60 * minute;
const day = 24 * hour;

const seedNotifications = (): NotificationItem[] => {
  const now = Date.now();
  return [
    {
      id: 'seed-task-1',
      category: 'task',
      titleKey: 'notification.template.newTask.title',
      messageKey: 'notification.template.newTask.message',
      vars: { orderId: 'JD-202606' },
      createdAt: now - 5 * minute,
      read: false,
      link: '/(main)/tasks',
    },
    {
      id: 'seed-system-1',
      category: 'system',
      titleKey: 'notification.template.system.title',
      messageKey: 'notification.template.system.message',
      createdAt: now - 2 * hour,
      read: false,
    },
    {
      id: 'seed-wallet-1',
      category: 'wallet',
      titleKey: 'notification.template.walletCredited.title',
      messageKey: 'notification.template.walletCredited.message',
      vars: { amount: '$24.50' },
      createdAt: now - 1 * day,
      read: true,
      link: '/(main)/earnings',
    },
    {
      id: 'seed-order-1',
      category: 'order',
      titleKey: 'notification.template.orderSigned.title',
      messageKey: 'notification.template.orderSigned.message',
      vars: { orderId: 'JD-202588' },
      createdAt: now - 2 * day,
      read: true,
      link: '/order/10239485',
    },
  ];
};

let mockCache: NotificationItem[] | null = null;

function getMockStore(): NotificationItem[] {
  if (mockCache) return mockCache;
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      mockCache = JSON.parse(stored) as NotificationItem[];
      return mockCache;
    }
  }
  mockCache = seedNotifications();
  saveMock();
  return mockCache;
}

function saveMock(): void {
  if (typeof localStorage !== 'undefined' && mockCache) {
    localStorage.setItem(storageKey, JSON.stringify(mockCache));
  }
}

function mockDelay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ── notificationApi 对象 ────────────────────────────────────────────

// 批C C1：真模式走后端 /rider/notifications 四端点（批A A3，RIDER 角色）；
// mock 保留给 isMockMode（本地开发免配/无登录态）。
export const notificationApi = {
  async list(): Promise<NotificationItem[]> {
    if (isMockMode) {
      const items = getMockStore().slice();
      return mockDelay(items.sort((a, b) => b.createdAt - a.createdAt));
    }
    const res = await api.get<NotificationRaw[]>('/rider/notifications');
    return res.data.map(transformNotification);
  },

  async getUnreadCount(): Promise<number> {
    if (isMockMode) {
      return mockDelay(getMockStore().filter((item) => !item.read).length);
    }
    const res = await api.get<{ count: number }>('/rider/notifications/unread-count');
    return res.data.count;
  },

  async markAsRead(id: string): Promise<void> {
    if (isMockMode) {
      const target = getMockStore().find((item) => item.id === id);
      if (!target || target.read) return;
      target.read = true;
      saveMock();
      return;
    }
    // 后端幂等（已读再 PATCH 直接成功），await 落库
    await api.patch<{ success: boolean }>(`/rider/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    if (isMockMode) {
      let changed = false;
      getMockStore().forEach((item) => {
        if (!item.read) {
          item.read = true;
          changed = true;
        }
      });
      if (changed) saveMock();
      return;
    }
    await api.post<{ success: boolean }>('/rider/notifications/read-all');
  },

  async add(
    input: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>,
  ): Promise<NotificationItem | null> {
    // 批C 审查 P3-1：add 仅服务 mock store（真模式通知由后端产生），真模式拒绝写假数据
    if (!isMockMode) return null;

    // 检查用户设置（mock + real 都查）
    const settings = await riderSettingsApi.get();
    if (!settings.notificationsEnabled) return null;

    const item: NotificationItem = {
      ...input,
      id: generateId(),
      createdAt: Date.now(),
      read: false,
    };
    getMockStore().unshift(item);
    saveMock();
    return item;
  },
};
