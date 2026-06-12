import { create } from 'zustand';

import type { OrderHistoryItem, OrderHistoryStatus } from '../types/order';
import { getOrderHistory, getOrderById, countByStatus, getTodayStats, addOrderHistory, subscribeOrderHistory } from '../services/order';

type OrderState = {
  history: OrderHistoryItem[];
  statusCounts: Record<OrderHistoryStatus | 'all', number>;
  todayStats: { count: number; totalIncome: number };
  hydrated: boolean;
  hydrate: () => Promise<() => void>;
  getById: (id: string) => Promise<OrderHistoryItem | null>;
  add: (item: OrderHistoryItem) => Promise<void>;
};

export const useOrderStore = create<OrderState>((set) => ({
  history: [],
  statusCounts: { all: 0, completed: 0, cancelled: 0, transferred: 0 },
  todayStats: { count: 0, totalIncome: 0 },
  hydrated: false,

  hydrate: async () => {
    const [history, statusCounts, todayStats] = await Promise.all([
      getOrderHistory(),
      countByStatus(),
      getTodayStats(),
    ]);
    set({ history, statusCounts, todayStats, hydrated: true });

    const unsub = subscribeOrderHistory(async (items) => {
      const [statusCounts, todayStats] = await Promise.all([
        countByStatus(),
        getTodayStats(),
      ]);
      set({ history: items, statusCounts, todayStats });
    });
    return unsub;
  },

  getById: async (id: string) => {
    return getOrderById(id);
  },

  add: async (item: OrderHistoryItem) => {
    await addOrderHistory(item);
  },
}));
