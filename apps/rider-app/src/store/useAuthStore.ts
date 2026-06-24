import { create } from 'zustand';

import type { RiderProfile } from '../types/rider';
import { registerRiderProfile, updateRiderProfile } from '../services/user';
import { tokenStorage } from '../services/token-storage';

type AuthState = {
  isAuthenticated: boolean;
  rider: RiderProfile | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setRider: (rider: RiderProfile) => void;
  clearAuth: () => void;
  register: (profile: Partial<RiderProfile>) => Promise<void>;
  updateProfile: (patch: Partial<RiderProfile>) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  rider: null,
  hydrated: false,

  hydrate: async () => {
    try {
      // 真实 token 链路：token 唯一来源是 SecureStore（A.2 已落地）
      const token = await tokenStorage.get();
      set({ isAuthenticated: token !== null, hydrated: true });
    } catch (e) {
      console.error('[useAuthStore] hydrate failed:', e);
      set({ hydrated: true });
    }
  },

  setRider: (rider) => set({ rider, isAuthenticated: true }),

  clearAuth: () => set({ isAuthenticated: false, rider: null }),

  // register/updateProfile 仍走 services/user.ts（B.2 阶段迁移到 riderApi）
  register: async (profile) => {
    try {
      const registered = await registerRiderProfile(profile);
      set({ rider: registered, isAuthenticated: true });
    } catch (e) {
      console.error('[useAuthStore] register failed:', e);
      throw e;
    }
  },

  updateProfile: async (patch) => {
    try {
      const updated = await updateRiderProfile(patch);
      set({ rider: updated });
    } catch (e) {
      console.error('[useAuthStore] updateProfile failed:', e);
      throw e;
    }
  },
}));
