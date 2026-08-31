import { useCallback } from 'react';
import { router } from 'expo-router';

import { useLogin, useLogout, useSendSmsCode } from '../services/queries/useAuth';
import { useAuthStore } from '../store/useAuthStore';
import { tokenStorage } from '../services/token-storage';
import { riderApi } from '../services/user';
import { authApi } from '../services/auth';

export function useAuth() {
  const setRider = useAuthStore((s) => s.setRider);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const sendSmsMutation = useSendSmsCode();

  const login = useCallback(
    async (phone: string, password?: string, code?: string) => {
      const result = await loginMutation.mutateAsync({ phone, password, code });
      await tokenStorage.set(result.accessToken, result.refreshToken);

      // real 模式：login 不返回 rider 信息，按 role 单独拿
      // mock 模式：AuthResult 直接含 rider
      let rider = result.rider;
      if (!rider && result.role === 'rider') {
        try {
          rider = await riderApi.getProfile();
        } catch (e) {
          // profile 拉取失败：仍设登录态，rider 留空（页面用 useRiderProfile 重试）
          console.error('[useAuth.login] getProfile failed:', e);
        }
      }
      if (rider) {
        setRider(rider);
      } else {
        // customer 角色或 profile 失败：仅设 isAuthenticated，UI 走 apply 流程
        useAuthStore.setState({ isAuthenticated: true });
      }
      router.replace('/(main)/tasks');
      return result;
    },
    [loginMutation, setRider],
  );

  // Why: 开发环境 mock-login，跳过密码验证直接登录
  // role: customer → 用于骑手申请（apply 要求 customer 角色）
  // role: rider → 用于骑手功能测试
  const mockLogin = useCallback(
    async (role: 'customer' | 'rider' = 'rider') => {
      const result = await authApi.mockLogin(role);
      await tokenStorage.set(result.accessToken, result.refreshToken);

      let rider = result.rider;
      if (!rider && result.role === 'rider') {
        try {
          rider = await riderApi.getProfile();
        } catch (e) {
          console.error('[useAuth.mockLogin] getProfile failed:', e);
        }
      }
      if (rider) {
        setRider(rider);
      } else {
        useAuthStore.setState({ isAuthenticated: true });
      }
      if (role === 'rider') {
        router.replace('/(main)/tasks');
      }
      return result;
    },
    [setRider],
  );

  // 被动登出（凭证失效）：refresh 都 401 时由 axios 拦截器 onUnauthorized 回调触发。
  // Why：refresh 401 已是「凭证彻底失效」最终信号，此时该静默清状态 + 跳登录页，
  // 不走 logout()——logout() 语义是「用户主动登出」，会发后端 logout mutation，
  // 而 refreshToken 本就 401 失效，后端 logout 必然也 401，多余且噪声。
  // 顺序无关性：不依赖 tokenStorage 是否已被拦截器清过（幂等 clear + clearAuth）。
  const forceLogout = useCallback(() => {
    clearAuth();
    void tokenStorage.clear().catch(() => {});
    router.replace('/(auth)/login');
  }, [clearAuth]);

  const logout = useCallback(async () => {
    // 主动登出：先调后端拉黑 refreshToken（CLAUDE.md rider 弱网规则：失败也清本地）
    try {
      const refresh = await tokenStorage.getRefresh();
      if (refresh) await logoutMutation.mutateAsync(refresh);
    } catch {
      // 网络挂也清本地
    } finally {
      clearAuth();
      await tokenStorage.clear();
      router.replace('/(auth)/login');
    }
  }, [logoutMutation, clearAuth]);

  const sendSmsCode = useCallback(
    async (phone: string) => {
      await sendSmsMutation.mutateAsync(phone);
    },
    [sendSmsMutation],
  );

  return {
    login,
    mockLogin,
    logout,
    forceLogout,
    sendSmsCode,
    isLoginPending: loginMutation.isPending,
    isLogoutPending: logoutMutation.isPending,
    isSmsPending: sendSmsMutation.isPending,
  };
}
