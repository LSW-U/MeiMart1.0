import type { RiderStatus } from '@/src/types/rider';

export function useRiderStore() {
  return {
    status: 'offline' as RiderStatus,
    currentTaskId: null as string | null,
    setStatus: (_status: RiderStatus) => undefined,
    setCurrentTaskId: (_taskId: string | null) => undefined,
  };
}
