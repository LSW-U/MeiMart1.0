// 豁免说明（CLAUDE.md 规则 #25）：
// 本文件 5 个 mutation（loginPassword / loginSms / register / sendSmsCode / resetPassword）
// 全部为「纯异步操作」—— 提交后不立即更新任何列表，调用方在 onSuccess 后跳转页面。
// 因此不实现 onMutate 三件套，符合规则 #25 豁免条款。
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
