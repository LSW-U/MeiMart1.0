import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { initPersist } from '@/services/offline/persist';
import { initNetworkListener } from '@/services/offline/network';
import { initI18n, default as i18n } from '@/i18n';
import { initSentry } from '@/services/sentry';

initSentry();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60 * 1000,
      gcTime: 1000 * 60 * 60 * 24,
      networkMode: 'offlineFirst',
      refetchOnWindowFocus: false,
    },
    mutations: {
      networkMode: 'online',
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(() => queryClient);
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    void initI18n().then(() => {
      if (mounted) setI18nReady(true);
    });
    const unsubscribeNetwork = initNetworkListener();
    void initPersist(client);
    return () => {
      mounted = false;
      unsubscribeNetwork?.();
    };
  }, [client]);

  if (!i18nReady) return null;

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
