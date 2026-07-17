import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '@/services/api';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  // Why: 初始化时从 tokenStorage 恢复 token，同步 isAuthenticated
  initFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken, isAuthenticated: true });
        // Why: 同步持久化到 tokenStorage，避免刷新页面后 token 丢失导致 401
        void tokenStorage.set(accessToken, refreshToken);
      },
      clearAuth: () => {
        set({ accessToken: null, refreshToken: null, isAuthenticated: false });
        // Why: 清除内存时也清除持久化存储
        void tokenStorage.clear();
      },
      initFromStorage: async () => {
        // Why: 应用启动时从 SecureStore/AsyncStorage 恢复 token
        // 避免 isAuthenticated 与 token 状态不一致（isAuthenticated=true 但 token 已清除）
        const token = await tokenStorage.get();
        const refresh = await tokenStorage.getRefresh();
        if (token && refresh) {
          set({ accessToken: token, refreshToken: refresh, isAuthenticated: true });
        } else {
          set({ accessToken: null, refreshToken: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Why: 不持久化任何字段，token 唯一来源是 tokenStorage
      // isAuthenticated 在 initFromStorage 中动态计算
      partialize: () => ({}), // 空对象，不持久化任何状态
    },
  ),
);
