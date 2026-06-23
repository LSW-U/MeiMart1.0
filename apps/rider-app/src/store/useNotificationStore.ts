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
    try {
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
    } catch (e) {
      console.error('[useNotificationStore] hydrate failed:', e);
      set({ hydrated: true });
      return () => {};
    }
  },

  markRead: async (id: string) => {
    try {
      await markAsRead(id);
      const unreadCount = await getUnreadCount();
      set({ unreadCount });
    } catch (e) {
      console.error('[useNotificationStore] markRead failed:', e);
    }
  },

  markAllRead: async () => {
    try {
      await markAllAsRead();
      set({ unreadCount: 0 });
    } catch (e) {
      console.error('[useNotificationStore] markAllRead failed:', e);
    }
  },

  add: async (input) => {
    try {
      const result = await addNotification(input);
      if (result) {
        const items = await getNotifications();
        const unreadCount = items.filter((i) => !i.read).length;
        set({ items, unreadCount });
      }
      return result;
    } catch (e) {
      console.error('[useNotificationStore] add failed:', e);
      return null;
    }
  },
}));
