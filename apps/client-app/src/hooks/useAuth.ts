import { useCallback } from 'react';
import {
  useLoginPassword,
  useResetPassword,
  useVerifySms,
  useCompleteRegister,
  useSendUnifiedSmsCode,
} from '@/services/queries/useAuth';
import { authApi } from '@/services/auth';
import type { VerifySmsResult } from '@/services/auth';
import { useAuthStore } from '@/store/authStore';
import { useSmsChallengeStore } from '@/store/smsChallengeStore';
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
  const resetPassword = useResetPassword();

  // 批A2-3 增补#3: 'sms' mode 已随 /common/auth/login-sms 链删除——login-sms 页切 unified
  // sendUnifiedSms + verify 分流，密码登录页直达用 useLoginPassword（login.tsx 自管）
  const login = useCallback(
    async (input: LoginInput) => {
      const result = await loginPassword.mutateAsync(input);
      setAuth(result.accessToken, result.refreshToken);
      await tokenStorage.set(result.accessToken, result.refreshToken);
      router.replace('/(main)/home');
      return result;
    },
    [loginPassword, setAuth],
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

  // ── unified 短信入口（批A2-1）：send 存 challengeId → verify 按 action 分流 ──

  const setChallenge = useSmsChallengeStore((s) => s.setChallenge);
  const setRegistrationTicket = useSmsChallengeStore((s) => s.setRegistrationTicket);
  const clearChallenge = useSmsChallengeStore((s) => s.clear);
  const verifySms = useVerifySms();
  const completeRegister = useCompleteRegister();
  const sendUnifiedMutation = useSendUnifiedSmsCode();
  const applyLogin = useCallback(
    async (result: { accessToken: string; refreshToken: string }) => {
      setAuth(result.accessToken, result.refreshToken);
      await tokenStorage.set(result.accessToken, result.refreshToken);
      router.replace('/(main)/home');
    },
    [setAuth],
  );

  const sendUnifiedSms = useCallback(
    async (
      phone: string,
      scene?: 'LOGIN' | 'REGISTER' | 'RESET_PASSWORD',
      captcha?: { captchaId: string; captchaText: string },
    ) => {
      const result = await sendUnifiedMutation.mutateAsync({ phone, scene, captcha });
      setChallenge(result.challengeId);
      return result;
    },
    [sendUnifiedMutation, setChallenge],
  );

  // Why: 三分支都在同一回调里收敛，调用方（login-sms 页）只管等结果 / 展示文案：
  //   LOGIN    → 直接进首页（token 由后端在 verify 响应里签发）
  //   REGISTER → 暂存 registrationTicket → register/complete（agreedToTerms:true）→ 进首页。
  //              password（批1 R7 方案v3）：complete 步骤可选提交，register 页传表单密码
  //              （后端 hash 入库）；login-sms 侧不传（后端建号 password:null，「设密码」
  //              是后续独立能力/首次登录走 password-reset）
  //   BLOCKED  → 抛 BlockedError，调用方 toast「账号异常，请联系客服」，禁止继续
  const verify = useCallback(
    async (input: { phone: string; code: string; password?: string }): Promise<VerifySmsResult> => {
      const challengeId = useSmsChallengeStore.getState().challengeId;
      if (!challengeId) {
        throw new Error('challengeId missing — call sendSms first');
      }
      const result = await verifySms.mutateAsync({
        phone: input.phone,
        code: input.code,
        challengeId,
      });
      if (result.action === 'LOGIN' && result.accessToken && result.refreshToken) {
        await applyLogin({ accessToken: result.accessToken, refreshToken: result.refreshToken });
        return result;
      }
      if (result.action === 'REGISTER' && result.registrationTicket) {
        setRegistrationTicket(result.registrationTicket);
        const authResult = await completeRegister.mutateAsync({
          registrationTicket: result.registrationTicket,
          challengeId,
          ...(input.password ? { password: input.password } : {}),
        });
        clearChallenge();
        await applyLogin(authResult);
        return result;
      }
      // 批A2-3 增补#4: 只有显式 action==='BLOCKED' 才走 BlockedError——后端异常/契约外响应
      // （如 5xx 网关 JSON、action 缺失、LOGIN 但 token 缺失）不再被误报为「账号异常」，
      // 调用方 catch 里非 BlockedError 走 toApiErrorText 通用文案
      if (result.action === 'BLOCKED') {
        throw new BlockedError();
      }
      throw new Error(
        `unexpected verify response: action=${String((result as { action?: unknown }).action)}`,
      );
    },
    [verifySms, completeRegister, applyLogin, setRegistrationTicket, clearChallenge],
  );

  return {
    login,
    logout,
    // 批1：旧 sendSms（/sms-code）已删——发码统一走 sendUnifiedSms（scene 透传，LOGIN 缺省）
    resetPassword: resetPassword.mutateAsync,
    // unified 入口：三 auth 页共用；旧的 login 留给密码登录页（批A2-3 收口）；
    // signUp（旧 /register 链）批1 P2-2 已删——注册统一 unified verify→complete
    sendUnifiedSms,
    sendUnifiedPending: sendUnifiedMutation.isPending,
    verify,
    isPending: loginPassword.isPending || verifySms.isPending || completeRegister.isPending,
  };
}

/** Why: BLOCKED 分流需要可识别的错误类型，调用方据此 toast「联系客服」而非通用失败 */
export class BlockedError extends Error {
  constructor() {
    super('account blocked');
    this.name = 'BlockedError';
  }
}
