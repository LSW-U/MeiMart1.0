import { create } from 'zustand';

import type { RiderProfile } from '../types/rider';
import { riderApi } from '../services/user';
import { ApiError } from '../services/api';
import { tokenStorage } from '../services/token-storage';
// 第四轮修复 P1-4：console.error 落完整 error 对象（AxiosError 带 config.headers.
// Authorization/config.data）= 凭证与 PII 入 logcat。redactError 只留安全面。
import { redactError } from '../utils/redact';

type AuthState = {
  isAuthenticated: boolean;
  rider: RiderProfile | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setRider: (rider: RiderProfile) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  rider: null,
  hydrated: false,

  hydrate: async () => {
    // P6-2：幂等——已 hydrate 过直接返回（防 _layout StoreInitializer + app/index + profile 三处重复调用重复拉 profile）。
    // Why：hydrate 在 StoreInitializer（root _layout）、index 跳转、profile useFocusEffect 三处被调，无幂等会并发拉 3 次 profile。
    if (useAuthStore.getState().hydrated) {
      if (__DEV__) console.warn('[useAuthStore] hydrate already done, skip');
      return;
    }
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
        // 认证失败（角色不匹配 E-AUTH-001/010，或 401 token 过期/失效）：
        // 清除登录态让用户重新登录，避免卡在半登录态（token 无效却 isAuthenticated=true）
        if (
          e instanceof ApiError &&
          (e.code === 'E-AUTH-001' || e.code === 'E-AUTH-010' || e.status === 401)
        ) {
          console.warn('[useAuthStore] auth invalid, clearing:', e.code ?? `HTTP ${e.status}`);
          await tokenStorage.clear();
          set({ isAuthenticated: false, rider: null, hydrated: true });
          return;
        }
        // 其他错误（网络瞬断等）：仍设登录态，rider 留空（页面用 useRiderProfile 重试）
        // 第四轮修复 P1-4：redactError 脱敏（原整 error 对象含 Authorization/config.data）
        console.error('[useAuthStore] hydrate profile failed:', redactError(e));
        set({ isAuthenticated: true, hydrated: true });
      }
    } catch (e) {
      // 第四轮修复 P1-4：redactError 脱敏（同上）
      console.error('[useAuthStore] hydrate failed:', redactError(e));
      set({ hydrated: true });
    }
  },

  setRider: (rider) => set({ rider, isAuthenticated: true }),

  clearAuth: () => set({ isAuthenticated: false, rider: null }),
}));
