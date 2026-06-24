import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { RiderProfile } from '@/src/types/rider';

import { riderApi } from '../user';
import { useAuthStore } from '../../store/useAuthStore';

export const riderProfileKey = ['rider', 'profile'] as const;

export function useRiderProfile() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: riderProfileKey,
    queryFn: () => riderApi.getProfile(),
    enabled: isAuthenticated,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setRider = useAuthStore((s) => s.setRider);

  return useMutation({
    mutationFn: (patch: Partial<RiderProfile>) => riderApi.updateProfile(patch),
    onMutate: async (patch) => {
      // 乐观更新：取消 in-flight queries + snapshot 当前 cache + 立即写入新值
      await queryClient.cancelQueries({ queryKey: riderProfileKey });
      const previous = queryClient.getQueryData<RiderProfile>(riderProfileKey);
      const currentStore = useAuthStore.getState().rider;
      if (previous) {
        const next: RiderProfile = { ...previous, ...patch };
        queryClient.setQueryData(riderProfileKey, next);
        setRider(next);
      } else if (currentStore) {
        // query cache 还没填充时，至少同步 store
        setRider({ ...currentStore, ...patch });
      }
      return { previous };
    },
    onError: (_err, _patch, ctx) => {
      // 回滚 cache 和 store
      if (ctx?.previous) {
        queryClient.setQueryData(riderProfileKey, ctx.previous);
        setRider(ctx.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: riderProfileKey });
    },
  });
}
