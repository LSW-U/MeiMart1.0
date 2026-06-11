import type { NotificationItem } from '../types/notification';
import { getRiderSettings } from './settings';

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

let notifications: NotificationItem[] | null = null;
const listeners = new Set<(items: NotificationItem[]) => void>();

const getStore = (): NotificationItem[] => {
  if (notifications) return notifications;

  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      notifications = JSON.parse(stored) as NotificationItem[];
      return notifications;
    }
  }

  notifications = seedNotifications();
  saveStore();
  return notifications;
};

const saveStore = () => {
  if (typeof localStorage !== 'undefined' && notifications) {
    localStorage.setItem(storageKey, JSON.stringify(notifications));
  }
};

const notifyListeners = () => {
  const snapshot = getStore().slice();
  listeners.forEach((listener) => listener(snapshot));
};

const generateId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export async function getNotifications(): Promise<NotificationItem[]> {
  return getStore()
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getUnreadCount(): Promise<number> {
  return getStore().filter((item) => !item.read).length;
}

export async function markAsRead(id: string): Promise<void> {
  const target = getStore().find((item) => item.id === id);
  if (!target || target.read) return;
  target.read = true;
  saveStore();
  notifyListeners();
}

export async function markAllAsRead(): Promise<void> {
  let changed = false;
  getStore().forEach((item) => {
    if (!item.read) {
      item.read = true;
      changed = true;
    }
  });
  if (!changed) return;
  saveStore();
  notifyListeners();
}

export async function addNotification(
  input: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>,
): Promise<NotificationItem | null> {
  const settings = await getRiderSettings();
  if (!settings.notificationsEnabled) return null;

  const item: NotificationItem = {
    ...input,
    id: generateId(),
    createdAt: Date.now(),
    read: false,
  };
  getStore().unshift(item);
  saveStore();
  notifyListeners();
  return item;
}

export function subscribeNotifications(listener: (items: NotificationItem[]) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
