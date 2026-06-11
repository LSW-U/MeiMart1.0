import type { OrderHistoryItem, OrderHistoryStatus } from '../types/order';

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

let cache: OrderHistoryItem[] | null = null;
const listeners = new Set<(items: OrderHistoryItem[]) => void>();

const getStore = (): OrderHistoryItem[] => {
  if (cache) return cache;

  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      cache = JSON.parse(stored) as OrderHistoryItem[];
      return cache;
    }
  }

  cache = seedHistory();
  save();
  return cache;
};

const save = () => {
  if (typeof localStorage !== 'undefined' && cache) {
    localStorage.setItem(storageKey, JSON.stringify(cache));
  }
};

const notify = () => {
  const snapshot = getStore().slice();
  listeners.forEach((listener) => listener(snapshot));
};

export async function getOrderHistory(): Promise<OrderHistoryItem[]> {
  return getStore()
    .slice()
    .sort((a, b) => b.completedAt - a.completedAt);
}

export async function getOrderById(id: string): Promise<OrderHistoryItem | null> {
  return getStore().find((item) => item.id === id) ?? null;
}

export async function countByStatus(): Promise<Record<OrderHistoryStatus | 'all', number>> {
  const items = getStore();
  return {
    all: items.length,
    completed: items.filter((item) => item.status === 'completed').length,
    cancelled: items.filter((item) => item.status === 'cancelled').length,
    transferred: items.filter((item) => item.status === 'transferred').length,
  };
}

export async function addOrderHistory(item: OrderHistoryItem): Promise<void> {
  const store = getStore();
  const existing = store.findIndex((entry) => entry.id === item.id);
  if (existing >= 0) {
    store[existing] = item;
  } else {
    store.unshift(item);
  }
  save();
  notify();
}

export function subscribeOrderHistory(listener: (items: OrderHistoryItem[]) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
