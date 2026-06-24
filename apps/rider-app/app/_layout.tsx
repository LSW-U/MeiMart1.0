import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setOnUnauthorized } from '../src/services/api';
import { AppProviders } from '../src/providers/AppProviders';
import { useAuth } from '../src/hooks/useAuth';
import { ToastHost } from '../src/components/feedback/Toast';
import { useAuthStore } from '../src/store/useAuthStore';

function StoreInitializer({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);
  const { logout } = useAuth();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setOnUnauthorized(() => {
      void logout();
    });

    // useAuthStore.hydrate 拉 rider profile 填 store（B.2.2 已实现）
    // 其他数据（task lists / orders / earnings / notifications / settings）由各页面 useXxx 自动 fetch
    void useAuthStore.getState().hydrate();
  }, [logout]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProviders>
        <StoreInitializer>
          <StatusBar style="dark" />
          <ToastHost />
          <Stack screenOptions={{ headerShown: false }} />
        </StoreInitializer>
      </AppProviders>
    </SafeAreaProvider>
  );
}
