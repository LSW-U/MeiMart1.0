import { useCallback } from 'react';
import { router } from 'expo-router';

import { useLogin, useLogout, useSendSmsCode } from '../services/queries/useAuth';
import { useAuthStore } from '../store/useAuthStore';
import { tokenStorage } from '../services/token-storage';
import { riderApi } from '../services/user';

export function useAuth() {
  const setRider = useAuthStore((s) => s.setRider);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const sendSmsMutation = useSendSmsCode();

  const login = useCallback(
    async (phone: string, password?: string, code?: string) => {
      console.log('[useAuth.login] start', {
        phone,
        hasPassword: Boolean(password),
        hasCode: Boolean(code),
      });
      const result = await loginMutation.mutateAsync({ phone, password, code });
      console.log('[useAuth.login] mutation result', {
        hasToken: Boolean(result.accessToken),
        role: result.role,
      });
      await tokenStorage.set(result.accessToken, result.refreshToken);
      console.log('[useAuth.login] tokenStorage.set done');

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
        console.log('[useAuth.login] setRider done');
      } else {
        // customer 角色或 profile 失败：仅设 isAuthenticated，UI 走 apply 流程
        useAuthStore.setState({ isAuthenticated: true });
      }
      router.replace('/(main)/tasks');
      return result;
    },
    [loginMutation, setRider],
  );

  const logout = useCallback(async () => {
    // 先调后端拉黑 refreshToken（CLAUDE.md rider 弱网规则：失败也清本地）
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
    logout,
    sendSmsCode,
    isLoginPending: loginMutation.isPending,
    isLogoutPending: logoutMutation.isPending,
    isSmsPending: sendSmsMutation.isPending,
  };
}
