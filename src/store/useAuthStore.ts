import { create } from 'zustand';

import type { RiderProfile } from '../types/rider';
import { getRiderProfile, isRiderSessionActive, startRiderSession, registerRiderProfile, updateRiderProfile, resetRiderSession } from '../services/user';

type AuthState = {
  token: string | null;
  rider: RiderProfile | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  register: (profile: Partial<RiderProfile>) => Promise<void>;
  updateProfile: (patch: Partial<RiderProfile>) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  rider: null,
  hydrated: false,

  hydrate: async () => {
    try {
      const active = await isRiderSessionActive();
      if (active) {
        const profile = await getRiderProfile();
        set({ token: 'session', rider: profile, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch (e) {
      console.error('[useAuthStore] hydrate failed:', e);
      set({ hydrated: true });
    }
  },

  login: async () => {
    try {
      await startRiderSession();
      const profile = await getRiderProfile();
      set({ token: 'session', rider: profile });
    } catch (e) {
      console.error('[useAuthStore] login failed:', e);
      throw e;
    }
  },

  logout: async () => {
    try {
      await resetRiderSession();
    } catch (e) {
      console.error('[useAuthStore] logout failed:', e);
    }
    set({ token: null, rider: null });
  },

  register: async (profile) => {
    try {
      const registered = await registerRiderProfile(profile);
      set({ token: 'session', rider: registered });
    } catch (e) {
      console.error('[useAuthStore] register failed:', e);
      throw e;
    }
  },

  updateProfile: async (patch: Partial<RiderProfile>) => {
    try {
      const updated = await updateRiderProfile(patch);
      set({ rider: updated });
    } catch (e) {
      console.error('[useAuthStore] updateProfile failed:', e);
      throw e;
    }
  },
}));
