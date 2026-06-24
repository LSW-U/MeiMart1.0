import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { useAuthStore } from '../src/store/useAuthStore';

export default function IndexPage() {
  const [redirectTo, setRedirectTo] = useState<'/(auth)/login' | '/(main)/tasks' | null>(null);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate().then(() => {
      // hydrate 后 isAuthenticated 已基于 SecureStore token 设置
      const active = useAuthStore.getState().isAuthenticated;
      setRedirectTo(active ? '/(main)/tasks' : '/(auth)/login');
    });
  }, [hydrate]);

  if (!redirectTo) return null;

  return <Redirect href={redirectTo} />;
}
