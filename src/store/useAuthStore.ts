import { create } from 'zustand';

import type { RiderProfile } from '../types/rider';
import { getRiderProfile, isRiderSessionActive, startRiderSession, updateRiderProfile, resetRiderSession } from '../services/user';

type AuthState = {
  token: string | null;
  rider: RiderProfile | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<RiderProfile>) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  rider: null,
  hydrated: false,

  hydrate: async () => {
    const active = await isRiderSessionActive();
    if (active) {
      const profile = await getRiderProfile();
      set({ token: 'session', rider: profile, hydrated: true });
    } else {
      set({ hydrated: true });
    }
  },

  login: async () => {
    await startRiderSession();
    const profile = await getRiderProfile();
    set({ token: 'session', rider: profile });
  },

  logout: async () => {
    await resetRiderSession();
    set({ token: null, rider: null });
  },

  updateProfile: async (patch: Partial<RiderProfile>) => {
    const updated = await updateRiderProfile(patch);
    set({ rider: updated });
  },
}));
