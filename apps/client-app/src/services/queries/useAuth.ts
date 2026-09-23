// 豁免说明（CLAUDE.md 规则 #25）：
// 本文件 mutation（loginPassword / register / sendSmsCode / resetPassword /
// sendUnifiedSmsCode / fetchCaptcha / verifySms / completeRegister）
// 全部为「纯异步操作」—— 提交后不立即更新任何列表，调用方在 onSuccess 后跳转或提示。
// 因此不实现 onMutate 三件套，符合规则 #25 豁免条款。
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/services/auth';
export function useLoginPassword() {
  return useMutation({
    mutationFn: authApi.loginPassword,
  });
}

// 批A2-3 增补#3: 旧 /common/auth/login-sms 链已删（login-sms 页切 unified verify，全仓零消费）；
// useLoginSms mutation 一并移除，register/reset 仍留旧 sendSmsCode 等 scene 契约核实
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

// Why: unified 发码（challengeId 模式）仅 login-sms 链使用；register/reset 留旧 sendSmsCode 保 scene
export function useSendUnifiedSmsCode() {
  return useMutation({
    mutationFn: ({
      phone,
      captcha,
    }: {
      phone: string;
      captcha?: { captchaId: string; captchaText: string };
    }) => authApi.sendUnifiedSmsCode(phone, captcha),
  });
}

// Why: 图形验证码签发（批A2-2）——纯获取类 mutation，无列表更新，规则 #25 豁免
export function useFetchCaptcha() {
  return useMutation({
    mutationFn: () => authApi.fetchCaptcha(),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: authApi.resetPassword,
  });
}

export function useVerifySms() {
  return useMutation({
    mutationFn: authApi.verifySms,
  });
}

export function useCompleteRegister() {
  return useMutation({
    mutationFn: authApi.completeRegister,
  });
}
