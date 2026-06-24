import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { RiderSettings } from '../settings';
import { riderSettingsApi } from '../settings';

export const riderSettingsKey = ['rider', 'settings'] as const;

export function useRiderSettings() {
  return useQuery({
    queryKey: riderSettingsKey,
    queryFn: () => riderSettingsApi.get(),
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
