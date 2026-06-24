import type { NotificationItem } from '@/src/types/notification';

import { api, isMockMode } from './api';
import { riderSettingsApi } from './settings';

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

export const notificationApi = {
  async list(): Promise<NotificationItem[]> {
    if (isMockMode) {
      const items = getMockStore().slice();
      return mockDelay(items.sort((a, b) => b.createdAt - a.createdAt));
    }
    const res = await api.get<NotificationItem[]>('/notifications');
    return res.data;
  },

  async getUnreadCount(): Promise<number> {
    if (isMockMode) {
      return mockDelay(getMockStore().filter((item) => !item.read).length);
    }
    const res = await api.get<number>('/notifications/unread-count');
    return res.data;
  },

  async markAsRead(id: string): Promise<void> {
    if (isMockMode) {
      const target = getMockStore().find((item) => item.id === id);
      if (!target || target.read) return;
      target.read = true;
      saveMock();
      return;
    }
    await api.patch(`/notifications/${encodeURIComponent(id)}/read`);
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
    await api.patch('/notifications/read-all');
  },

  async add(
    input: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>,
  ): Promise<NotificationItem | null> {
    // 检查用户设置（mock + real 都查）
    const settings = await riderSettingsApi.get();
    if (!settings.notificationsEnabled) return null;

    if (isMockMode) {
      const item: NotificationItem = {
        ...input,
        id: generateId(),
        createdAt: Date.now(),
        read: false,
      };
      getMockStore().unshift(item);
      saveMock();
      return item;
    }
    const res = await api.post<NotificationItem>('/notifications', input);
    return res.data;
  },
};

// ── 兼容 export（delivery.ts writeMockSideEffects + earnings.ts 仍用） ──

export async function addNotification(
  input: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>,
): Promise<NotificationItem | null> {
  return notificationApi.add(input);
}

export async function getUnreadCount(): Promise<number> {
  return notificationApi.getUnreadCount();
}
