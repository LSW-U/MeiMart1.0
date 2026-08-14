import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import {
  useFonts,
  NotoSerif_400Regular,
  NotoSerif_600SemiBold,
  NotoSerif_700Bold,
} from '@expo-google-fonts/noto-serif';
import {
  PlusJakartaSans_400Regular as PJS_400,
  PlusJakartaSans_600SemiBold as PJS_600,
  PlusJakartaSans_700Bold as PJS_700,
} from '@expo-google-fonts/plus-jakarta-sans';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { initPersist } from '@/services/offline/persist';
import { initNetworkListener } from '@/services/offline/network';
import { initI18n, default as i18n } from '@/i18n';
import { initSentry } from '@/services/sentry';
import { useAuthStore } from '@/store/authStore';
import { ToastContainer } from '@/components/feedback/ToastContainer';
// T2-B: queryClient 抽到独立模块 —— 配置含 QueryCache 全局 401 → clearAuth（单测可直接 import）
import { queryClient } from '@/providers/queryClient';

initSentry();

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(() => queryClient);
  const [i18nReady, setI18nReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const [fontsLoaded] = useFonts({
    NotoSerif: NotoSerif_400Regular,
    'NotoSerif-SemiBold': NotoSerif_600SemiBold,
    'NotoSerif-Bold': NotoSerif_700Bold,
    PlusJakartaSans: PJS_400,
    'PlusJakartaSans-SemiBold': PJS_600,
    'PlusJakartaSans-Bold': PJS_700,
  });

  useEffect(() => {
    let mounted = true;

    // Why: 先初始化 authStore（从 tokenStorage 恢复 token），再初始化 React Query persist
    // 避免 isAuthenticated 与 token 状态不一致导致 401
    useAuthStore.getState().initFromStorage().then(() => {
      if (mounted) {
        setAuthReady(true);
        // authStore 初始化后再初始化 React Query persist
        void initPersist(client);
      }
    });

    void initI18n().then(() => {
      if (mounted) setI18nReady(true);
    });

    const unsubscribeNetwork = initNetworkListener();

    return () => {
      mounted = false;
      unsubscribeNetwork?.();
    };
  }, [client]);

  if (!i18nReady || !fontsLoaded || !authReady) return null;

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
        <ToastContainer />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
