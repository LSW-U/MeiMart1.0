import { create } from 'zustand';

import type { DeliveryTask } from '../types/task';
import { getAvailableTasks, getTaskLists, acceptTask, updateTaskStatus } from '../services/task';

type TaskLists = {
  available: DeliveryTask[];
  pickups: DeliveryTask[];
  deliveries: DeliveryTask[];
};

type TaskState = {
  lists: TaskLists;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  accept: (id: string) => Promise<void>;
  updateStatus: (id: string, status: DeliveryTask['status']) => Promise<void>;
};

export const useTaskStore = create<TaskState>((set, get) => ({
  lists: { available: [], pickups: [], deliveries: [] },
  hydrated: false,

  hydrate: async () => {
    const lists = await getTaskLists();
    set({ lists, hydrated: true });
  },

  refresh: async () => {
    const lists = await getTaskLists();
    set({ lists });
  },

  accept: async (id: string) => {
    await acceptTask(id);
    await get().refresh();
  },

  updateStatus: async (id: string, status) => {
    await updateTaskStatus(id, status);
    await get().refresh();
  },
}));
