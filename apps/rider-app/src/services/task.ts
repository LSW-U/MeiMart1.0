import type { DeliveryTask, TaskStatus } from '@/src/types/task';

import { api, isMockMode } from './api';

type TaskLists = {
  available: DeliveryTask[];
  pickups: DeliveryTask[];
  deliveries: DeliveryTask[];
};

// ── Mock layer (localStorage for Web dev) ──────────────────────────

const storageKey = 'mei-delivery-app:tasks:v2';

const initialTasks: DeliveryTask[] = [
  {
    id: '102',
    orderId: 'TL Delivery #102',
    status: 'available',
    pickup: {
      title: 'Lita Store (Colmera)',
      address: 'Rua de Colmera, Dili',
      contactName: 'Lita Front Desk',
      contactPhone: '+670 7720 1020',
    },
    dropoff: {
      title: 'Timor Plaza Apartments, Unit 4B',
      address: 'Avenida Presidente Nicolau Lobato, Dili',
      contactName: 'Resident 4B',
      contactPhone: '+670 7733 4072',
    },
    fee: 10,
    distanceKm: 2.5,
    estimatedMinutes: 37,
    items: ['Groceries', '2kg', '2 units'],
    note: 'Extra large iced coffee, lid sealed tight.',
  },
  {
    id: '103',
    orderId: 'TL Delivery #103',
    status: 'available',
    pickup: {
      title: 'Cafe Aroma (Colmera)',
      address: 'Rua de Colmera, Dili',
      contactName: 'Aroma Counter',
    },
    dropoff: {
      title: 'Ministry of Finance',
      address: 'Aitarak Laran, Dili',
      contactName: 'Reception Desk',
    },
    fee: 6.5,
    distanceKm: 1,
    estimatedMinutes: 45,
    items: ['Coffee', '1 bag'],
  },
  {
    id: '104',
    orderId: 'TL Delivery #104',
    status: 'accepted',
    pickup: {
      title: 'Heritage Bakery (Dili Center)',
      address: 'Rua 15 de Outubro, Dili',
      contactName: 'Bakery Pickup Desk',
    },
    dropoff: {
      title: 'Hotel Timor - Lobby',
      address: 'Avenida Marechal Carmona, Dili',
      contactName: 'Concierge',
    },
    fee: 9,
    distanceKm: 1.8,
    estimatedMinutes: 30,
    items: ['Pastry box', '6 units'],
    note: 'Hand to concierge, ask for guest Room 312.',
  },
  {
    id: '105',
    orderId: 'TL Delivery #105',
    status: 'delivering',
    pickup: {
      title: 'Lita Store (Colmera)',
      address: 'Rua de Colmera, Dili',
      contactName: 'Lita Front Desk',
    },
    dropoff: {
      title: 'UNTL Campus - Faculty Office',
      address: 'Avenida Cidade de Lisboa, Dili',
      contactName: 'Faculty Reception',
      contactPhone: '+670 7755 4072',
    },
    fee: 10,
    distanceKm: 2.5,
    estimatedMinutes: 30,
    items: ['Matcha Latte', 'Seasonal Fruit Platter'],
    note: 'Call on arrival. Do not leave at door.',
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
    available: tasks.filter((task) => task.status === 'available').map(cloneTask),
    pickups: tasks.filter((task) => task.status === 'accepted' || task.status === 'pickingUp').map(cloneTask),
    deliveries: tasks.filter((task) => task.status === 'delivering').map(cloneTask),
  };
}

// ── taskApi 对象 ────────────────────────────────────────────────────

export const taskApi = {
  async getLists(): Promise<TaskLists> {
    if (isMockMode) return mockDelay(buildMockLists(), 400);
    const res = await api.get<TaskLists>('/tasks/lists');
    return res.data;
  },

  async getById(id: string): Promise<DeliveryTask | null> {
    if (isMockMode) {
      const task = findMockTask(id);
      return mockDelay(task ? cloneTask(task) : null, 300);
    }
    const res = await api.get<DeliveryTask | null>(`/tasks/${encodeURIComponent(id)}`);
    return res.data;
  },

  async accept(id: string): Promise<DeliveryTask> {
    if (isMockMode) {
      return mockDelay(await mutateMockStatus(id, 'accepted'), 500);
    }
    const res = await api.post<DeliveryTask>(`/tasks/${encodeURIComponent(id)}/accept`);
    return res.data;
  },

  async updateStatus(id: string, status: TaskStatus): Promise<DeliveryTask> {
    if (isMockMode) {
      return mockDelay(await mutateMockStatus(id, status), 400);
    }
    const res = await api.patch<DeliveryTask>(`/tasks/${encodeURIComponent(id)}/status`, { status });
    return res.data;
  },

  async hasActive(): Promise<boolean> {
    if (isMockMode) {
      const active = getMockTasks().some(
        (task) => task.status === 'accepted' || task.status === 'pickingUp' || task.status === 'delivering',
      );
      return mockDelay(active, 200);
    }
    const res = await api.get<boolean>('/tasks/has-active');
    return res.data;
  },
};

async function mutateMockStatus(id: string, status: TaskStatus): Promise<DeliveryTask> {
  const task = findMockTask(id);
  if (!task) throw new Error(`Task not found: ${id}`);
  task.status = status;
  saveMockTasks();
  return cloneTask(task);
}

// ── 兼容 export（useTaskStore 仍用，B.3.3 整体接入新 hook 后清理） ────

export async function getTaskLists(): Promise<TaskLists> {
  return taskApi.getLists();
}

export async function getTaskById(id: string): Promise<DeliveryTask | null> {
  return taskApi.getById(id);
}

export async function acceptTask(id: string): Promise<DeliveryTask> {
  return taskApi.accept(id);
}

export async function hasActiveTasks(): Promise<boolean> {
  return taskApi.hasActive();
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<DeliveryTask> {
  return taskApi.updateStatus(id, status);
}
