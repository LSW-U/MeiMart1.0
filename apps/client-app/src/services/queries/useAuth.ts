// 豁免说明（CLAUDE.md 规则 #25）：
// 本文件 mutation（loginPassword / resetPassword /
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
// useLoginSms mutation 一并移除；批1：旧 sendSmsCode（/sms-code）已随两页迁 unified 删除；
// 批1 P2-2（审查）: useRegister（旧 /register 链）已删——注册统一 unified verify→complete 链

// Why: unified 发码（challengeId 模式）三页共用；scene 批1 起随请求透传（LOGIN 缺省）
export function useSendUnifiedSmsCode() {
  return useMutation({
    mutationFn: ({
      phone,
      scene,
      captcha,
    }: {
      phone: string;
      scene?: 'LOGIN' | 'REGISTER' | 'RESET_PASSWORD';
      captcha?: { captchaId: string; captchaText: string };
    }) => authApi.sendUnifiedSmsCode(phone, scene, captcha),
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
