import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { isRiderSessionActive } from '../src/services/user';

export default function IndexPage() {
  const [redirectTo, setRedirectTo] = useState<'/(auth)/login' | '/(main)/tasks' | null>(null);

  useEffect(() => {
    void isRiderSessionActive().then((active) => {
      setRedirectTo(active ? '/(main)/tasks' : '/(auth)/login');
    });
  }, []);

  if (!redirectTo) return null;

  return <Redirect href={redirectTo} />;
}
