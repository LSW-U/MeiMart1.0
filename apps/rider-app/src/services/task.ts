import type { DeliveryTask, ReportIssueReason, TaskStatus } from '@/src/types/task';

import { api, buildQuery, isMockMode } from './api';

type TaskLists = {
  available: DeliveryTask[];
  pickups: DeliveryTask[];
  deliveries: DeliveryTask[];
};

// ── Mock layer (localStorage for Web dev) ──────────────────────────

const storageKey = 'mei-delivery-app:tasks:v3';

// mock 数据全部使用后端真实枚举值（大写），保证 mock/real 切换时 UI 一致
const initialTasks: DeliveryTask[] = [
  {
    id: '102',
    orderId: 'TL Delivery #102',
    riderId: null,
    warehouseId: 'wh-001',
    status: 'PENDING_ASSIGN',
    pickupAddress: 'Lita Store (Colmera), Rua de Colmera, Dili',
    pickupLat: -8.5569,
    pickupLng: 125.5273,
    dropoffAddress: 'Timor Plaza Apartments, Unit 4B, Avenida Presidente Nicolau Lobato, Dili',
    dropoffLat: -8.5334,
    dropoffLng: 125.5654,
    assignedAt: null,
    pickedUpAt: null,
    deliveredAt: null,
    note: 'Extra large iced coffee, lid sealed tight.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // 兼容字段
    pickup: { title: 'Lita Store (Colmera)', address: 'Rua de Colmera, Dili', contactName: 'Lita Front Desk', contactPhone: '+670 7720 1020' },
    dropoff: { title: 'Timor Plaza Apartments, Unit 4B', address: 'Avenida Presidente Nicolau Lobato, Dili', contactName: 'Resident 4B', contactPhone: '+670 7733 4072' },
    fee: 10,
    distanceKm: 2.5,
    estimatedMinutes: 37,
    items: ['Groceries', '2kg', '2 units'],
  },
  {
    id: '103',
    orderId: 'TL Delivery #103',
    riderId: null,
    warehouseId: 'wh-001',
    status: 'PENDING_ASSIGN',
    pickupAddress: 'Cafe Aroma (Colmera), Rua de Colmera, Dili',
    pickupLat: -8.557,
    pickupLng: 125.5275,
    dropoffAddress: 'Ministry of Finance, Aitarak Laran, Dili',
    dropoffLat: -8.5493,
    dropoffLng: 125.5532,
    assignedAt: null,
    pickedUpAt: null,
    deliveredAt: null,
    note: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pickup: { title: 'Cafe Aroma (Colmera)', address: 'Rua de Colmera, Dili', contactName: 'Aroma Counter' },
    dropoff: { title: 'Ministry of Finance', address: 'Aitarak Laran, Dili', contactName: 'Reception Desk' },
    fee: 6.5,
    distanceKm: 1,
    estimatedMinutes: 45,
    items: ['Coffee', '1 bag'],
  },
  {
    id: '104',
    orderId: 'TL Delivery #104',
    riderId: 'r001',
    warehouseId: 'wh-001',
    status: 'ASSIGNED',
    pickupAddress: 'Heritage Bakery (Dili Center), Rua 15 de Outubro, Dili',
    pickupLat: -8.5539,
    pickupLng: 125.5373,
    dropoffAddress: 'Hotel Timor - Lobby, Avenida Marechal Carmona, Dili',
    dropoffLat: -8.5487,
    dropoffLng: 125.5365,
    assignedAt: new Date().toISOString(),
    pickedUpAt: null,
    deliveredAt: null,
    note: 'Hand to concierge, ask for guest Room 312.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pickup: { title: 'Heritage Bakery (Dili Center)', address: 'Rua 15 de Outubro, Dili', contactName: 'Bakery Pickup Desk' },
    dropoff: { title: 'Hotel Timor - Lobby', address: 'Avenida Marechal Carmona, Dili', contactName: 'Concierge' },
    fee: 9,
    distanceKm: 1.8,
    estimatedMinutes: 30,
    items: ['Pastry box', '6 units'],
  },
  {
    id: '105',
    orderId: 'TL Delivery #105',
    riderId: 'r001',
    warehouseId: 'wh-001',
    status: 'DELIVERING',
    pickupAddress: 'Lita Store (Colmera), Rua de Colmera, Dili',
    pickupLat: -8.5569,
    pickupLng: 125.5273,
    dropoffAddress: 'UNTL Campus - Faculty Office, Avenida Cidade de Lisboa, Dili',
    dropoffLat: -8.5185,
    dropoffLng: 125.5275,
    assignedAt: new Date().toISOString(),
    pickedUpAt: new Date().toISOString(),
    deliveredAt: null,
    note: 'Call on arrival. Do not leave at door.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pickup: { title: 'Lita Store (Colmera)', address: 'Rua de Colmera, Dili', contactName: 'Lita Front Desk' },
    dropoff: { title: 'UNTL Campus - Faculty Office', address: 'Avenida Cidade de Lisboa, Dili', contactName: 'Faculty Reception', contactPhone: '+670 7755 4072' },
    fee: 10,
    distanceKm: 2.5,
    estimatedMinutes: 30,
    items: ['Matcha Latte', 'Seasonal Fruit Platter'],
  },
];

let mockTasksCache: DeliveryTask[] | null = null;

const cloneTask = (task: DeliveryTask): DeliveryTask => ({
  ...task,
  pickup: { ...task.pickup },
  dropoff: { ...task.dropoff },
  items: [...task.items],
});

function getMockTasks(): DeliveryTask[] {
  if (mockTasksCache) return mockTasksCache;
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      mockTasksCache = JSON.parse(stored) as DeliveryTask[];
      return mockTasksCache;
    }
  }
  mockTasksCache = initialTasks.map(cloneTask);
  return mockTasksCache;
}

function saveMockTasks(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(storageKey, JSON.stringify(getMockTasks()));
  }
}

function findMockTask(id: string): DeliveryTask | undefined {
  return getMockTasks().find((task) => task.id === id);
}

function mockDelay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function buildMockLists(): TaskLists {
  const tasks = getMockTasks();
  return {
    available: tasks.filter((task) => task.status === 'PENDING_ASSIGN').map(cloneTask),
    pickups: tasks
      .filter((task) => task.status === 'ASSIGNED' || task.status === 'PICKED_UP')
      .map(cloneTask),
    deliveries: tasks.filter((task) => task.status === 'DELIVERING').map(cloneTask),
  };
}

// 后端 view → 骑手 App 内部兼容字段填充（real 模式专用）
// 后端 DeliveryTaskView 字段精简（无 fee/distance/items/pickup.title 等），
// 这里映射出旧 UI 期望的嵌套结构，缺失字段填默认空值避免组件 break。
function fromView(view: DeliveryTask): DeliveryTask {
  // 后端 view 字段精简，pickup/dropoff 嵌套结构由本地构造（缺失填默认空值避免组件 break）
  return {
    ...view,
    pickup: view.pickup ?? {
      title: '',
      address: view.pickupAddress,
      coordinates: { latitude: view.pickupLat, longitude: view.pickupLng },
      lat: view.pickupLat,
      lng: view.pickupLng,
    },
    dropoff: view.dropoff ?? {
      title: '',
      address: view.dropoffAddress,
      coordinates: { latitude: view.dropoffLat, longitude: view.dropoffLng },
      lat: view.dropoffLat,
      lng: view.dropoffLng,
    },
    fee: view.fee ?? 0,
    distanceKm: view.distanceKm ?? 0,
    estimatedMinutes: view.estimatedMinutes ?? 0,
    items: view.items ?? [],
  };
}

// ── taskApi 对象 ────────────────────────────────────────────────────

export const taskApi = {
  async getLists(warehouseId?: string): Promise<TaskLists> {
    if (isMockMode) return mockDelay(buildMockLists(), 400);
    const query = buildQuery(warehouseId ? { warehouseId } : {});
    const res = await api.get<{ items: DeliveryTask[] }>(`/rider/dispatch/tasks${query}`);
    const all = res.data.items.map(fromView);
    return {
      available: all.filter((t) => t.status === 'PENDING_ASSIGN'),
      pickups: all.filter((t) => t.status === 'ASSIGNED' || t.status === 'PICKED_UP'),
      deliveries: all.filter((t) => t.status === 'DELIVERING'),
    };
  },

  // 后端无单任务详情端点：从 getLists 派生
  async getById(id: string): Promise<DeliveryTask | null> {
    if (isMockMode) {
      const task = findMockTask(id);
      return mockDelay(task ? cloneTask(task) : null, 300);
    }
    const lists = await this.getLists();
    const found =
      lists.available.find((t) => t.id === id) ??
      lists.pickups.find((t) => t.id === id) ??
      lists.deliveries.find((t) => t.id === id) ??
      null;
    return found ? fromView(found) : null;
  },

  async accept(id: string): Promise<DeliveryTask> {
    if (isMockMode) {
      return mockDelay(await mutateMockStatus(id, 'ASSIGNED'), 500);
    }
    const res = await api.post<DeliveryTask>(
      `/rider/dispatch/tasks/${encodeURIComponent(id)}/accept`,
    );
    return fromView(res.data);
  },

  async pickup(id: string, note?: string): Promise<DeliveryTask> {
    if (isMockMode) {
      return mockDelay(await mutateMockStatus(id, 'PICKED_UP'), 400);
    }
    const res = await api.post<DeliveryTask>(
      `/rider/dispatch/tasks/${encodeURIComponent(id)}/pickup`,
      { note },
    );
    return fromView(res.data);
  },

  async deliver(id: string, body: { collectedAmount?: number; note?: string }): Promise<DeliveryTask> {
    if (isMockMode) {
      return mockDelay(await mutateMockStatus(id, 'DELIVERED'), 400);
    }
    const res = await api.post<DeliveryTask>(
      `/rider/dispatch/tasks/${encodeURIComponent(id)}/deliver`,
      body,
    );
    return fromView(res.data);
  },

  async reportIssue(
    id: string,
    body: { reason: ReportIssueReason; note?: string },
  ): Promise<DeliveryTask> {
    if (isMockMode) {
      return mockDelay(await mutateMockStatus(id, 'FAILED'), 400);
    }
    const res = await api.post<DeliveryTask>(
      `/rider/dispatch/tasks/${encodeURIComponent(id)}/report-issue`,
      body,
    );
    return fromView(res.data);
  },

  // 后端无 has-active 端点：从 getLists 派生
  async hasActive(): Promise<boolean> {
    if (isMockMode) {
      const active = getMockTasks().some(
        (task) =>
          task.status === 'ASSIGNED' ||
          task.status === 'PICKED_UP' ||
          task.status === 'DELIVERING',
      );
      return mockDelay(active, 200);
    }
    const lists = await this.getLists();
    return lists.pickups.length > 0 || lists.deliveries.length > 0;
  },
};

async function mutateMockStatus(id: string, status: TaskStatus): Promise<DeliveryTask> {
  const task = findMockTask(id);
  if (!task) throw new Error(`Task not found: ${id}`);
  task.status = status;
  task.updatedAt = new Date().toISOString();
  if (status === 'ASSIGNED' && !task.assignedAt) {
    task.assignedAt = new Date().toISOString();
  } else if (status === 'PICKED_UP' && !task.pickedUpAt) {
    task.pickedUpAt = new Date().toISOString();
  } else if (status === 'DELIVERED' && !task.deliveredAt) {
    task.deliveredAt = new Date().toISOString();
  }
  saveMockTasks();
  return cloneTask(task);
}
