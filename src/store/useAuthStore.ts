import type { RiderProfile } from '@/src/types/rider';

export function useAuthStore() {
  return {
    token: null as string | null,
    rider: null as RiderProfile | null,
    setToken: (_token: string | null) => undefined,
    setRider: (_rider: RiderProfile | null) => undefined,
  };
}
