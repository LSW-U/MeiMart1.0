import { useCallback } from 'react';
import {
  useLoginPassword,
  useLoginSms,
  useRegister,
  useSendSmsCode,
  useResetPassword,
} from '@/services/queries/useAuth';
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
    clearAuth();
    await tokenStorage.clear();
    router.replace('/(auth)/login');
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
