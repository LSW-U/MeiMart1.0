import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '@/services/api';
// 第四轮修复 P1-1（D3）：登出清持久化缓存收口——7 条登出路径原只有 profile.tsx 显式调
// clearPersistedQueryCache，其余 6 条（settings×2/index.web/queryClient 401/api 401/useAuth）
// 只翻内存状态，AsyncStorage 落盘的 orders/addresses/refunds/cart 等用户数据残留。
// 本模块无 authStore 依赖（persist.ts 有，反向 import 会闭环），clearAuth 内直调后
// 全部路径自动收口，调用方零改动。
import { clearPersistedQueryCache } from '@/services/offline/persistCacheClear';

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
        // 第四轮修复 P1-1（D3）：登出统一收口清持久化 query 缓存（PII 治理）——
        // 7 条登出路径全部经本函数，无需各调用方自调（profile.tsx 原直调已移除）
        void clearPersistedQueryCache();
      },
      initFromStorage: async () => {
        // Why: 应用启动时从 tokenStorage（SecureStore）恢复 token
        // 避免 isAuthenticated 与 token 状态不一致（isAuthenticated=true 但 token 已清除）
        // TODO(cookie 改造): token 进 httpOnly cookie 后 tokenStorage 消失，此处改为调
        //   GET /client/user/profile 验 cookie 设登录态（接口已存在，见 src/services/user.ts）
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
