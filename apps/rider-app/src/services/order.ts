import type { OrderHistoryItem, OrderHistoryStatus } from '@/src/types/order';

import { api, isMockMode } from './api';

// ── Mock layer (localStorage for Web dev) ──────────────────────────

const storageKey = 'mei-delivery-app:orderHistory:v1';

const hour = 60 * 60 * 1000;
const day = 24 * hour;

const seedHistory = (): OrderHistoryItem[] => {
  const now = Date.now();
  return [
    {
      id: '10239485',
      orderNo: '#10239485',
      status: 'completed',
      completedAt: now - 4 * hour,
      pickupName: 'Heritage Bakery (Dili Center)',
      pickupAddress: 'Rua 15 de Outubro, Dili',
      dropoffName: 'Timor Plaza Apartments, Unit 4B',
      dropoffAddress: 'Avenida Presidente Nicolau Lobato, Dili',
      income: 12.5,
      distanceKm: 2.5,
      durationMinutes: 28,
    },
    {
      id: '10239486',
      orderNo: '#10239486',
      status: 'cancelled',
      completedAt: now - 5 * hour,
      pickupName: 'Cafe Aroma (Colmera)',
      pickupAddress: 'Rua de Colmera, Dili',
      dropoffName: 'Ministry of Finance',
      dropoffAddress: 'Aitarak Laran, Dili',
      income: 0,
      distanceKm: 1.1,
      durationMinutes: 0,
    },
    {
      id: '10239487',
      orderNo: '#10239487',
      status: 'transferred',
      completedAt: now - 6 * hour,
      pickupName: 'Lita Store (Colmera)',
      pickupAddress: 'Rua de Colmera, Dili',
      dropoffName: 'UNTL Campus',
      dropoffAddress: 'Avenida Cidade de Lisboa, Dili',
      income: 0,
      distanceKm: 2.0,
      durationMinutes: 0,
    },
    {
      id: '10239488',
      orderNo: '#10239488',
      status: 'completed',
      completedAt: now - day,
      pickupName: 'Burger Lab (Dili Beach)',
      pickupAddress: 'Avenida de Portugal, Dili',
      dropoffName: 'Hotel Timor - Lobby',
      dropoffAddress: 'Avenida Marechal Carmona, Dili',
      income: 8.2,
      distanceKm: 1.8,
      durationMinutes: 22,
    },
    {
      id: '10239489',
      orderNo: '#10239489',
      status: 'completed',
      completedAt: now - 2 * day,
      pickupName: 'Lita Store (Colmera)',
      pickupAddress: 'Rua de Colmera, Dili',
      dropoffName: 'Embassy of Australia',
      dropoffAddress: 'Avenida dos Mártires da Pátria, Dili',
      income: 15.4,
      distanceKm: 3.4,
      durationMinutes: 33,
    },
    {
      id: '10239490',
      orderNo: '#10239490',
      status: 'cancelled',
      completedAt: now - 2 * day - 3 * hour,
      pickupName: 'Heritage Bakery (Dili Center)',
      pickupAddress: 'Rua 15 de Outubro, Dili',
      dropoffName: 'Tasi Tolu Beach Resort',
      dropoffAddress: 'Tasi Tolu, Dili',
      income: 0,
      distanceKm: 5.6,
      durationMinutes: 0,
    },
  ];
};

let mockCache: OrderHistoryItem[] | null = null;

function getMockStore(): OrderHistoryItem[] {
  if (mockCache) return mockCache;
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      mockCache = JSON.parse(stored) as OrderHistoryItem[];
      return mockCache;
    }
  }
  mockCache = seedHistory();
  saveMock();
  return mockCache;
}

function saveMock(): void {
  if (typeof localStorage !== 'undefined' && mockCache) {
    localStorage.setItem(storageKey, JSON.stringify(mockCache));
  }
}

function mockDelay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// ── orderApi 对象 ───────────────────────────────────────────────────

export const orderApi = {
  async getHistory(): Promise<OrderHistoryItem[]> {
    if (isMockMode) {
      const items = getMockStore().slice();
      return mockDelay(items.sort((a, b) => b.completedAt - a.completedAt));
    }
    const res = await api.get<OrderHistoryItem[]>('/orders/history');
    return res.data;
  },

  async getById(id: string): Promise<OrderHistoryItem | null> {
    if (isMockMode) {
      return mockDelay(getMockStore().find((item) => item.id === id) ?? null);
    }
    const res = await api.get<OrderHistoryItem | null>(`/orders/${encodeURIComponent(id)}`);
    return res.data;
  },

  async countByStatus(): Promise<Record<OrderHistoryStatus | 'all', number>> {
    if (isMockMode) {
      const items = getMockStore();
      return mockDelay({
        all: items.length,
        completed: items.filter((item) => item.status === 'completed').length,
        cancelled: items.filter((item) => item.status === 'cancelled').length,
        transferred: items.filter((item) => item.status === 'transferred').length,
      });
    }
    const res = await api.get<Record<OrderHistoryStatus | 'all', number>>('/orders/count-by-status');
    return res.data;
  },

  async getTodayStats(): Promise<{ count: number; totalIncome: number }> {
    if (isMockMode) {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const items = getMockStore().filter(
        (item) => item.completedAt >= startOfDay && item.status === 'completed',
      );
      return mockDelay({
        count: items.length,
        totalIncome: items.reduce((sum, item) => sum + item.income, 0),
      });
    }
    const res = await api.get<{ count: number; totalIncome: number }>('/orders/today-stats');
    return res.data;
  },

  async add(item: OrderHistoryItem): Promise<void> {
    if (isMockMode) {
      const store = getMockStore();
      const existing = store.findIndex((entry) => entry.id === item.id);
      if (existing >= 0) {
        store[existing] = item;
      } else {
        store.unshift(item);
      }
      saveMock();
      return;
    }
    await api.post('/orders', item);
  },
};

// ── 兼容 export（delivery.ts writeMockSideEffects 仍用） ─────────────

export async function addOrderHistory(item: OrderHistoryItem): Promise<void> {
  await orderApi.add(item);
}
