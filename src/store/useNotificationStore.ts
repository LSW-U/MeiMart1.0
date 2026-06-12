import { create } from 'zustand';

import type { NotificationItem } from '../types/notification';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, addNotification, subscribeNotifications } from '../services/notification';

type NotificationState = {
  items: NotificationItem[];
  unreadCount: number;
  hydrated: boolean;
  hydrate: () => Promise<() => void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  add: (input: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => Promise<NotificationItem | null>;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  unreadCount: 0,
  hydrated: false,

  hydrate: async () => {
    const [items, unreadCount] = await Promise.all([
      getNotifications(),
      getUnreadCount(),
    ]);
    set({ items, unreadCount, hydrated: true });

    const unsub = subscribeNotifications(async (items) => {
      const unreadCount = items.filter((i) => !i.read).length;
      set({ items, unreadCount });
    });
    return unsub;
  },

  markRead: async (id: string) => {
    await markAsRead(id);
    const unreadCount = await getUnreadCount();
    set({ unreadCount });
  },

  markAllRead: async () => {
    await markAllAsRead();
    set({ unreadCount: 0 });
  },

  add: async (input) => {
    const result = await addNotification(input);
    if (result) {
      const items = await getNotifications();
      const unreadCount = items.filter((i) => !i.read).length;
      set({ items, unreadCount });
    }
    return result;
  },
}));
