import { create } from 'zustand';

import type { RiderProfile } from '../types/rider';
import { riderApi } from '../services/user';
import { tokenStorage } from '../services/token-storage';

type AuthState = {
  isAuthenticated: boolean;
  rider: RiderProfile | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setRider: (rider: RiderProfile) => void;
  clearAuth: () => void;
  register: (profile: Partial<RiderProfile>) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  rider: null,
  hydrated: false,

  hydrate: async () => {
    try {
      const token = await tokenStorage.get();
      if (!token) {
        set({ hydrated: true });
        return;
      }
      // 已登录：拉 rider profile 填 store（修 B.1.3 cold-start rider=null 遗留）
      try {
        const profile = await riderApi.getProfile();
        set({ isAuthenticated: true, rider: profile, hydrated: true });
      } catch (e) {
        // profile 拉取失败：仍设登录态，rider 留空（页面用 useRiderProfile 重试）
        console.error('[useAuthStore] hydrate profile failed:', e);
        set({ isAuthenticated: true, hydrated: true });
      }
    } catch (e) {
      console.error('[useAuthStore] hydrate failed:', e);
      set({ hydrated: true });
    }
  },

  setRider: (rider) => set({ rider, isAuthenticated: true }),

  clearAuth: () => set({ isAuthenticated: false, rider: null }),

  register: async (profile) => {
    try {
      const registered = await riderApi.register(profile);
      set({ rider: registered, isAuthenticated: true });
    } catch (e) {
      console.error('[useAuthStore] register failed:', e);
      throw e;
    }
  },
}));
