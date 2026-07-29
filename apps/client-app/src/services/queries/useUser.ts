import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/services/user';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';

// Why: favorites → useFavorites；notifications → useNotifications（Phase 4/5 拆出）
//      coupons → usePromotion.useCoupons（折扣 UI 统一方案 §3，废弃旧 useUser.useCoupons）
export const PROFILE_QUERY_KEY = ['user', 'profile'] as const;

export function useProfile() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => userApi.getProfile(),
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
    enabled: isAuthenticated, // 未登录时不请求
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<User>) => userApi.updateProfile(updates),
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: PROFILE_QUERY_KEY });
      const previous = qc.getQueryData<User>(PROFILE_QUERY_KEY);
      qc.setQueryData<User>(PROFILE_QUERY_KEY, (old) => (old ? { ...old, ...updates } : old));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(PROFILE_QUERY_KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: PROFILE_QUERY_KEY }),
  });
}
