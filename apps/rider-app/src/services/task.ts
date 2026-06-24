import type { DeliveryTask, TaskStatus } from '@/src/types/task';

import { API_BASE_URL, request } from './api';

type TaskLists = {
  available: DeliveryTask[];
  pickups: DeliveryTask[];
  deliveries: DeliveryTask[];
};

// ── Mock layer (localStorage) ──────────────────────────────────────

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

let mockTasks: DeliveryTask[] | null = null;

const cloneTask = (task: DeliveryTask): DeliveryTask => ({
  ...task,
  pickup: { ...task.pickup },
  dropoff: { ...task.dropoff },
  items: [...task.items],
});

const getTasks = () => {
  if (mockTasks) return mockTasks;

  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      mockTasks = JSON.parse(stored) as DeliveryTask[];
      return mockTasks;
    }
  }

  mockTasks = initialTasks.map(cloneTask);
  return mockTasks;
};

const saveTasks = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(storageKey, JSON.stringify(getTasks()));
  }
};

const findTask = (id: string) => getTasks().find((task) => task.id === id);

// ── Public API ─────────────────────────────────────────────────────

const isRemote = () => API_BASE_URL.length > 0;

export async function getAvailableTasks(): Promise<DeliveryTask[]> {
  if (isRemote()) {
    return request<DeliveryTask[]>(`/tasks/available`);
  }
  return getTasks().filter((task) => task.status === 'available').map(cloneTask);
}

export async function getTaskLists(): Promise<TaskLists> {
  if (isRemote()) {
    return request<TaskLists>(`/tasks/lists`);
  }
  const tasks = getTasks();
  return {
    available: tasks.filter((task) => task.status === 'available').map(cloneTask),
    pickups: tasks.filter((task) => task.status === 'accepted' || task.status === 'pickingUp').map(cloneTask),
    deliveries: tasks.filter((task) => task.status === 'delivering').map(cloneTask),
  };
}

export async function getTaskById(id: string): Promise<DeliveryTask | null> {
  if (isRemote()) {
    return request<DeliveryTask | null>(`/tasks/${encodeURIComponent(id)}`);
  }
  const task = findTask(id);
  return task ? cloneTask(task) : null;
}

export async function acceptTask(id: string): Promise<DeliveryTask> {
  if (isRemote()) {
    return request<DeliveryTask>(`/tasks/${encodeURIComponent(id)}/accept`, { method: 'POST' });
  }
  return updateTaskStatus(id, 'accepted');
}

export async function hasActiveTasks(): Promise<boolean> {
  if (isRemote()) {
    return request<boolean>(`/tasks/has-active`);
  }
  return getTasks().some((task) => task.status === 'accepted' || task.status === 'pickingUp' || task.status === 'delivering');
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<DeliveryTask> {
  if (isRemote()) {
    return request<DeliveryTask>(`/tasks/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
  const task = findTask(id);
  if (!task) {
    throw new Error(`Task not found: ${id}`);
  }
  task.status = status;
  saveTasks();
  return cloneTask(task);
}
