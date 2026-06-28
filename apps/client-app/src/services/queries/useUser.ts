import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/services/user';
import type { User } from '@/types';

// Why: favorites → useFavorites；notifications → useNotifications（Phase 4/5 拆出）
export const PROFILE_QUERY_KEY = ['user', 'profile'] as const;
export const COUPONS_QUERY_KEY = ['user', 'coupons'] as const;

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => userApi.getProfile(),
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
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

export function useCoupons() {
  return useQuery({
    queryKey: COUPONS_QUERY_KEY,
    queryFn: () => userApi.getCoupons(),
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}
