import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/services/auth';

export function useLoginPassword() {
  return useMutation({
    mutationFn: authApi.loginPassword,
  });
}

export function useLoginSms() {
  return useMutation({
    mutationFn: authApi.loginSms,
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: authApi.register,
  });
}

export function useSendSmsCode() {
  return useMutation({
    mutationFn: authApi.sendSmsCode,
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: authApi.resetPassword,
  });
}
