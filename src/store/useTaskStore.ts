import { create } from 'zustand';

import type { DeliveryTask } from '../types/task';
import { confirmPickup, confirmDelivery } from '../services/delivery';
import { getTaskById, getTaskLists, acceptTask, hasActiveTasks, updateTaskStatus } from '../services/task';

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
  getById: (id: string) => Promise<DeliveryTask | null>;
  hasActive: () => Promise<boolean>;
  accept: (id: string) => Promise<void>;
  updateStatus: (id: string, status: DeliveryTask['status']) => Promise<void>;
  confirmPickup: (id: string) => Promise<void>;
  confirmDelivery: (id: string) => Promise<void>;
};

export const useTaskStore = create<TaskState>((set, get) => ({
  lists: { available: [], pickups: [], deliveries: [] },
  hydrated: false,

  hydrate: async () => {
    try {
      const lists = await getTaskLists();
      set({ lists, hydrated: true });
    } catch (e) {
      console.error('[useTaskStore] hydrate failed:', e);
      set({ hydrated: true });
    }
  },

  refresh: async () => {
    try {
      const lists = await getTaskLists();
      set({ lists });
    } catch (e) {
      console.error('[useTaskStore] refresh failed:', e);
    }
  },

  getById: async (id) => {
    try {
      return await getTaskById(id);
    } catch (e) {
      console.error('[useTaskStore] getById failed:', e);
      return null;
    }
  },

  hasActive: async () => {
    try {
      return await hasActiveTasks();
    } catch (e) {
      console.error('[useTaskStore] hasActive failed:', e);
      return false;
    }
  },

  accept: async (id: string) => {
    try {
      await acceptTask(id);
      await get().refresh();
    } catch (e) {
      console.error('[useTaskStore] accept failed:', e);
      throw e;
    }
  },

  updateStatus: async (id: string, status) => {
    try {
      await updateTaskStatus(id, status);
      await get().refresh();
    } catch (e) {
      console.error('[useTaskStore] updateStatus failed:', e);
      throw e;
    }
  },

  confirmPickup: async (id: string) => {
    try {
      await confirmPickup(id);
      await get().refresh();
    } catch (e) {
      console.error('[useTaskStore] confirmPickup failed:', e);
      throw e;
    }
  },

  confirmDelivery: async (id: string) => {
    try {
      await confirmDelivery(id);
      await get().refresh();
    } catch (e) {
      console.error('[useTaskStore] confirmDelivery failed:', e);
      throw e;
    }
  },
}));
