import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (token: string, refreshToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (token, refreshToken) => set({ token, refreshToken, isAuthenticated: true }),
      clearAuth: () => set({ token: null, refreshToken: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // 仅持久化登录态标记，token 唯一来源是 SecureStore（services/api.ts 的 tokenStorage）
      // Why: AsyncStorage 不加密，落盘 token 违反 CLAUDE.md「敏感数据用 SecureStore」规则，
      // 且与 SecureStore 双写存在 race（refresh token 时只更新 SecureStore + 内存，AsyncStorage 残留旧值）
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated }),
    },
  ),
);
