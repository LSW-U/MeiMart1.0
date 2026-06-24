import { useCallback } from 'react';
import { router } from 'expo-router';

import { useLogin, useLogout, useSendSmsCode } from '../services/queries/useAuth';
import { useAuthStore } from '../store/useAuthStore';
import { tokenStorage } from '../services/token-storage';

export function useAuth() {
  const setRider = useAuthStore((s) => s.setRider);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const sendSmsMutation = useSendSmsCode();

  const login = useCallback(
    async (phone: string, password?: string, code?: string) => {
      const result = await loginMutation.mutateAsync({ phone, password, code });
      await tokenStorage.set(result.token, result.refreshToken);
      setRider(result.rider);
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
