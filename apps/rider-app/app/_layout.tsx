import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setOnUnauthorized } from '../src/services/api';
import { ToastHost } from '../src/components/feedback/Toast';
import { useAppStore } from '../src/store/useAppStore';
import { useAuthStore } from '../src/store/useAuthStore';
import { useEarningsStore } from '../src/store/useEarningsStore';
import { useNotificationStore } from '../src/store/useNotificationStore';
import { useOrderStore } from '../src/store/useOrderStore';
import { useRiderStore } from '../src/store/useRiderStore';
import { useTaskStore } from '../src/store/useTaskStore';

function StoreInitializer({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setOnUnauthorized(() => {
      useAuthStore.getState().logout().catch(() => {});
    });

    void (async () => {
      await useAppStore.getState().hydrate();
      await useAuthStore.getState().hydrate();
      await Promise.all([
        useRiderStore.getState().hydrate(),
        useTaskStore.getState().hydrate(),
        useEarningsStore.getState().hydrate(),
        useNotificationStore.getState().hydrate(),
        useOrderStore.getState().hydrate(),
      ]);
    })();
  }, []);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreInitializer>
        <StatusBar style="dark" />
        <ToastHost />
        <Stack screenOptions={{ headerShown: false }} />
      </StoreInitializer>
    </SafeAreaProvider>
  );
}
