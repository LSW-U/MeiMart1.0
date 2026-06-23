import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { useAuthStore } from '../src/store/useAuthStore';

export default function IndexPage() {
  const [redirectTo, setRedirectTo] = useState<'/(auth)/login' | '/(main)/tasks' | null>(null);
  const hydrate = useAuthStore((s) => s.hydrate);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    void hydrate().then(() => {
      const active = useAuthStore.getState().token !== null;
      setRedirectTo(active ? '/(main)/tasks' : '/(auth)/login');
    });
  }, [hydrate]);

  if (!redirectTo) return null;

  return <Redirect href={redirectTo} />;
}
