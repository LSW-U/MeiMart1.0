import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../store/useAuthStore';
import type { RiderSettings } from '../settings';
import { riderSettingsApi } from '../settings';

export const riderSettingsKey = ['rider', 'settings'] as const;

export function useRiderSettings() {
  // Why: 未登录时（login/register/terms/privacy 等页经 useTranslation 间接调用）
  // 不应触发 getProfile，否则无 token 必然 401。与 useRiderProfile 保持一致的守卫。
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: riderSettingsKey,
    queryFn: () => riderSettingsApi.get(),
    enabled: isAuthenticated,
  });
}

export function useUpdateRiderSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<RiderSettings>) => riderSettingsApi.update(patch),
    onMutate: async (patch) => {
      // 乐观更新：cancelQueries + snapshot + 立即写入
      await queryClient.cancelQueries({ queryKey: riderSettingsKey });
      const previous = queryClient.getQueryData<RiderSettings>(riderSettingsKey);
      if (previous) {
        queryClient.setQueryData<RiderSettings>(riderSettingsKey, { ...previous, ...patch });
      }
      return { previous };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(riderSettingsKey, ctx.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: riderSettingsKey });
    },
  });
}
