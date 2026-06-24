// 豁免说明：本文件 3 个 mutation（login / logout / sendSmsCode）全部为「纯异步操作」——
// 提交后不立即更新任何列表，调用方在 onSuccess 后跳转页面或更新 useAuthStore。
// 因此不实现 onMutate 三件套（参照 client-app services/queries/useAuth.ts 同款豁免）。
import { useMutation } from '@tanstack/react-query';

import { authApi, type LoginPayload } from '../auth';

export function useLogin() {
  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: (refreshToken: string) => authApi.logout(refreshToken),
  });
}

export function useSendSmsCode() {
  return useMutation({
    mutationFn: (phone: string) => authApi.sendSmsCode(phone),
  });
}
