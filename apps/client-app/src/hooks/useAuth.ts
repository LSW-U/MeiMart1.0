import { useCallback } from 'react';
import {
  useLoginPassword,
  useLoginSms,
  useRegister,
  useSendSmsCode,
  useResetPassword,
} from '@/services/queries/useAuth';
import { authApi } from '@/services/auth';
import { useAuthStore } from '@/store/authStore';
import { tokenStorage } from '@/services/api';
import { router } from 'expo-router';

interface LoginInput {
  phone: string;
  password?: string;
  smsCode?: string;
}

export function useAuth() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const loginPassword = useLoginPassword();
  const loginSms = useLoginSms();
  const register = useRegister();
  const sendSms = useSendSmsCode();
  const resetPassword = useResetPassword();

  const login = useCallback(
    async (input: LoginInput, mode: 'password' | 'sms') => {
      const result =
        mode === 'password'
          ? await loginPassword.mutateAsync(input)
          : await loginSms.mutateAsync(input);
      setAuth(result.token, result.refreshToken);
      await tokenStorage.set(result.token, result.refreshToken);
      router.replace('/(main)/home');
      return result;
    },
    [loginPassword, loginSms, setAuth],
  );

  const signUp = useCallback(
    async (input: LoginInput) => {
      const result = await register.mutateAsync(input);
      setAuth(result.token, result.refreshToken);
      await tokenStorage.set(result.token, result.refreshToken);
      router.replace('/(main)/home');
      return result;
    },
    [register, setAuth],
  );

  const logout = useCallback(async () => {
    // 先通知后端拉黑 refreshToken（CLAUDE.md：logout 必传 refreshToken，服务端加 Redis 黑名单）
    // 网络挂掉也容错清本地，避免遗留登录态
    try {
      const refresh = await tokenStorage.getRefresh();
      if (refresh) await authApi.logout(refresh);
    } catch {
      // 拉黑失败不阻塞登出流程，本地仍要清干净
    } finally {
      clearAuth();
      await tokenStorage.clear();
      router.replace('/(auth)/login');
    }
  }, [clearAuth]);

  return {
    login,
    signUp,
    logout,
    sendSms: sendSms.mutateAsync,
    resetPassword: resetPassword.mutateAsync,
    isPending:
      loginPassword.isPending || loginSms.isPending || register.isPending || sendSms.isPending,
  };
}
