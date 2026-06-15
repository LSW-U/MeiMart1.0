import { Stack, useSegments, router } from 'expo-router';
import { useEffect } from 'react';
import { AppProviders } from '@/providers/AppProviders';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';

function RootAuthGate() {
  // TEMP: bypass auth for web preview
  const isAuthenticated = true;
  const segments = useSegments();

  useEffect(() => {
    if (isAuthenticated) return;
    const first = segments[0]?.toString() ?? '';
    const protectedGroups = [
      '(main)',
      'order',
      'address',
      'profile',
      'service',
      'coupons',
      'favorites',
    ];
    if (protectedGroups.some((g) => first === g)) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <RootAuthGate />
        <Stack screenOptions={{ headerShown: false }} />
      </AppProviders>
    </ErrorBoundary>
  );
}
