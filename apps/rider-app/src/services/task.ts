import type { DeliveryTask, ReportIssueReason, TaskStatus } from '@/src/types/task';

import { api, buildQuery, isMockMode } from './api';

export type TaskLists = {
  available: DeliveryTask[];
  pickups: DeliveryTask[];
  deliveries: DeliveryTask[];
};

// ── Mock layer (localStorage for Web dev) ──────────────────────────

const storageKey = 'mei-delivery-app:tasks:v3';

// mock 数据全部使用后端真实枚举值（大写），保证 mock/real 切换时 UI 一致
// P14 ④：每条任务带 taskType（delivery/return）+ refundId（return 关联退款，delivery 为 null）
const initialTasks: DeliveryTask[] = [
  {
    id: '104',
    orderId: 'TL Delivery #104',
    riderId: 'r001',
    warehouseId: 'wh-001',
    status: 'ASSIGNED',
    taskType: 'delivery',
    refundId: null,
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
    taskType: 'return',
    refundId: 'rf-105',
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
  // P14 ④ B1：return 任务三步流转示例（PICKED_UP 状态，进 pickups tab）
  // 用于 mock 下验证 return 流程：navigate 页点"开始配送"→startDelivering→DELIVERING→sign→deliver
  {
    id: '106',
    orderId: 'TL Return #106',
    riderId: 'r001',
    warehouseId: 'wh-001',
    status: 'PICKED_UP',
    taskType: 'return',
    refundId: 'rf-106',
    pickupAddress: 'Customer Return Address, Avenida Bispo Medeiros, Dili',
    pickupLat: -8.545,
    pickupLng: 125.55,
    dropoffAddress: 'Warehouse Return Center, Rua de Colmera, Dili',
    dropoffLat: -8.5569,
    dropoffLng: 125.5273,
    assignedAt: new Date().toISOString(),
    pickedUpAt: new Date().toISOString(),
    deliveredAt: null,
    note: 'Return pickup: defective item, original order #099.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pickup: { title: 'Customer (Return Pickup)', address: 'Avenida Bispo Medeiros, Dili', contactName: 'Customer', contactPhone: '+670 7744 1000' },
    dropoff: { title: 'Warehouse Return Center', address: 'Rua de Colmera, Dili', contactName: 'Warehouse Desk' },
    fee: 8,
    distanceKm: 3,
    estimatedMinutes: 35,
    items: ['Return Item A', '1 unit'],
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
//
// P14 ④：taskType / refundId 后端 DeliveryTaskView 已有，`...view` 直接透传，无需补默认值。
//
// TODO(W6-backend): 后端 W6 在 DeliveryTaskView 补 fee / distanceKm /
//   estimatedMinutes / items 四个字段后，删除下方 ?? 0 / ?? [] 默认值，
//   改为直接透传（fee: view.fee）。默认值是假数据，会让 UI 显示 $0/0km/0min。
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
      // T6 联系拨号：后端 toView 从 order.deliveryAddress.phone 透传（顶层字段），
      // 映射到 dropoff.contactPhone 供 TaskCard 联系按钮/尾号展示消费
      contactPhone: view.contactPhone,
    },
    // TODO(W6-backend): 后端补 fee 字段后删 ?? 0
    fee: view.fee ?? 0,
    // TODO(W6-backend): 后端补 distanceKm 字段后删 ?? 0
    distanceKm: view.distanceKm ?? 0,
    // TODO(W6-backend): 后端补 estimatedMinutes 字段后删 ?? 0
    estimatedMinutes: view.estimatedMinutes ?? 0,
    // TODO(W6-backend): 后端补 items 字段后删 ?? []
    items: view.items ?? [],
  };
}

// ── taskApi 对象 ────────────────────────────────────────────────────

export const taskApi = {
  async getLists(warehouseId?: string): Promise<TaskLists> {
    if (isMockMode) return mockDelay(buildMockLists(), 400);
    // Why: 后端拆两个端点 - tasks(抢单大厅 PENDING_ASSIGN) + my-tasks(骑手自己的 ASSIGNED/PICKED_UP/DELIVERING)
    const query = buildQuery(warehouseId ? { warehouseId } : {});
    // S2: allSettled 防 my-tasks 失败拖垮抢单大厅（弱网：一个失败不阻塞另一个，CLAUDE.md 规则 11-14）
    const [pendingSettled, mySettled] = await Promise.allSettled([
      api.get<{ items: DeliveryTask[] }>(`/rider/dispatch/tasks${query}`),
      api.get<{ items: DeliveryTask[] }>(`/rider/dispatch/my-tasks`),
    ]);
    // 抢单大厅失败是硬伤（骑手没法工作），抛出让 UI 显示错误重试
    if (pendingSettled.status === 'rejected') throw pendingSettled.reason;
    // my-tasks 失败降级到空数组（pickups/deliveries 暂空，available 仍展示，对齐规则 11 三态）
    if (mySettled.status === 'rejected') {
      console.warn('[task] my-tasks failed, fallback to empty:', mySettled.reason);
    }
    const pending = pendingSettled.value.data.items.map(fromView);
    const mine = mySettled.status === 'fulfilled' ? mySettled.value.data.items.map(fromView) : [];
    return {
      available: pending.filter((t) => t.status === 'PENDING_ASSIGN'),
      pickups: mine.filter((t) => t.status === 'ASSIGNED' || t.status === 'PICKED_UP'),
      deliveries: mine.filter((t) => t.status === 'DELIVERING'),
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

  /**
   * P14 ④ B1：开始配送（PICKED_UP → DELIVERING，仅 return 任务可调）
   * 后端 dispatch.service.ts:511 startDelivering：校验 taskType==='return'（否则 E-DISPATCH-020），
   * 事务内 deliveryTask.update(DELIVERING) + refund.update(pickedAt)。
   * delivery 任务保持两步（跳过 DELIVERING），不调本方法。
   */
  async startDelivering(id: string, note?: string): Promise<DeliveryTask> {
    if (isMockMode) {
      const task = findMockTask(id);
      if (!task) throw new Error(`Task not found: ${id}`);
      // mock 校验对齐后端 E-DISPATCH-020（仅 return 可调）
      if (task.taskType !== 'return') throw new Error('E-DISPATCH-020: startDelivering only for return task');
      return mockDelay(await mutateMockStatus(id, 'DELIVERING'), 400);
    }
    const res = await api.post<DeliveryTask>(
      `/rider/dispatch/tasks/${encodeURIComponent(id)}/start-delivering`,
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
