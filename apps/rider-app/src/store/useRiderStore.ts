import { create } from 'zustand';

import { getRiderSettings, subscribeRiderSettings, updateRiderSettings, type DutyStatus } from '../services/settings';

type RiderState = {
  status: DutyStatus;
  currentTaskId: string | null;
  notificationsEnabled: boolean;
  hydrated: boolean;
  hydrate: () => Promise<() => void>;
  setDutyStatus: (status: DutyStatus) => Promise<void>;
  toggleNotifications: (enabled: boolean) => Promise<void>;
};

export const useRiderStore = create<RiderState>((set) => ({
  status: 'offDuty',
  currentTaskId: null,
  notificationsEnabled: true,
  hydrated: false,

  hydrate: async () => {
    try {
      const settings = await getRiderSettings();
      set({
        status: settings.dutyStatus,
        notificationsEnabled: settings.notificationsEnabled,
        hydrated: true,
      });
      const unsub = subscribeRiderSettings((settings) => {
        set({
          status: settings.dutyStatus,
          notificationsEnabled: settings.notificationsEnabled,
        });
      });
      return unsub;
    } catch (e) {
      console.error('[useRiderStore] hydrate failed:', e);
      set({ hydrated: true });
      return () => {};
    }
  },

  setDutyStatus: async (status: DutyStatus) => {
    try {
      await updateRiderSettings({ dutyStatus: status });
    } catch (e) {
      console.error('[useRiderStore] setDutyStatus failed:', e);
    }
  },

  toggleNotifications: async (enabled: boolean) => {
    try {
      await updateRiderSettings({ notificationsEnabled: enabled });
    } catch (e) {
      console.error('[useRiderStore] toggleNotifications failed:', e);
    }
  },
}));
