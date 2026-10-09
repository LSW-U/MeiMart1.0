// add() 保留 mock 侧效应（delivery.ts writeMockSideEffects 用，mock 模式专属）。

import type { OrderHistoryItem, OrderHistoryStatus } from '@/src/types/order';

import { ApiError, api, buildQuery, isMockMode } from './api';

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

// ── real 分支适配层（后端四端点已上线：/rider/orders/history|stats/today|stats/status-counts|:id）──
//
// 后端派生口径（order-history.service.ts 头注释 + api-contract rider-order-history.ts）：
//   - completedAt = deliveredAt（completed）/ updatedAt（其余），epoch ms —— 与前端 Date 消费直通
//   - income = order.deliveryFee（分，Q2 拍板）→ /100 转元（earnings.ts centsToUsd 同款）
//   - durationMinutes / distanceKm：缺失给 0 —— 0 是后端「缺失」哨兵，直通，
//     前端既有降级消费（[id].tsx `durationMinutes > 0 ? … : '—'`）不破坏
//   - status 三值 completed|cancelled|transferred 与前端 OrderHistoryStatus 直通
const CENTS_PER_DOLLAR = 100;

interface RiderOrderHistoryRaw {
  id: string;
  orderNo: string;
  status: OrderHistoryStatus;
  completedAt: number;
  pickupName: string;
  pickupAddress: string;
  dropoffName: string;
  dropoffAddress: string;
  income: number; // 分
  distanceKm: number;
  durationMinutes: number;
}

function fromView(raw: RiderOrderHistoryRaw): OrderHistoryItem {
  return {
    ...raw,
    income: raw.income / CENTS_PER_DOLLAR,
  };
}

/** 单页上限=契约 max（api-contract RiderOrderHistoryQuery pageSize max(100)） */
const HISTORY_PAGE_SIZE = 100;

export const orderApi = {
  async getHistory(): Promise<OrderHistoryItem[]> {
    if (isMockMode) {
      const items = getMockStore().slice();
      return mockDelay(items.sort((a, b) => b.completedAt - a.completedAt));
    }
    // 列表页消费方（history.tsx）按全量做客户端 tab 过滤 + status-counts 徽标对账，
    // 故此处翻页拉全（单骑手终态任务量级小，后端实测 <150 行）；响应缺 items 按契约
    // 破坏上抛（earnings P3-4 同口径，不静默空列表）。
    const all: OrderHistoryItem[] = [];
    for (let page = 1; ; page += 1) {
      const res = await api.get<{ items: RiderOrderHistoryRaw[]; total: number }>(
        `/rider/orders/history${buildQuery({ page, pageSize: HISTORY_PAGE_SIZE })}`,
      );
      if (!res.data.items) throw new Error('[orderApi] getHistory: response missing items');
      all.push(...res.data.items.map(fromView));
      if (all.length >= res.data.total || res.data.items.length === 0) break;
    }
    return all.sort((a, b) => b.completedAt - a.completedAt);
  },

  async getById(id: string): Promise<OrderHistoryItem | null> {
    if (isMockMode) return mockDelay(getMockStore().find((item) => item.id === id) ?? null);
    // 404（非本人/非历史范围，E-RIDER-001）→ 业务 null，[id].tsx QueryBoundary 走 notFound 空态
    try {
      const res = await api.get<RiderOrderHistoryRaw>(`/rider/orders/${encodeURIComponent(id)}`);
      return fromView(res.data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
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
    const res = await api.get<Record<OrderHistoryStatus | 'all', number>>(
      '/rider/orders/stats/status-counts',
    );
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
    // totalIncome 后端为分（Σ order.deliveryFee）→ /100 转元，与列表 income 同口径
    const res = await api.get<{ count: number; totalIncome: number }>('/rider/orders/stats/today');
    return { count: res.data.count, totalIncome: res.data.totalIncome / CENTS_PER_DOLLAR };
  },

  async add(item: OrderHistoryItem): Promise<void> {
    const store = getMockStore();
    const existing = store.findIndex((entry) => entry.id === item.id);
    if (existing >= 0) {
      store[existing] = item;
    } else {
      store.unshift(item);
    }
    saveMock();
  },
};
