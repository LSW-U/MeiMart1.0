import { create } from 'zustand';

import type { RiderStatus } from '../types/rider';
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
  },

  setDutyStatus: async (status: DutyStatus) => {
    await updateRiderSettings({ dutyStatus: status });
  },

  toggleNotifications: async (enabled: boolean) => {
    await updateRiderSettings({ notificationsEnabled: enabled });
  },
}));
