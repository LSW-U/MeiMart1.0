import { type Href, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { isRiderSessionActive } from '../services/user';

export function useGoBack(fallback?: Href) {
  const router = useRouter();

  return useCallback(async () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (fallback) {
      router.replace(fallback);
      return;
    }
    const active = await isRiderSessionActive();
    router.replace(active ? '/(main)/profile' : '/(auth)/login');
  }, [router, fallback]);
}
