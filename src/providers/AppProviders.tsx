import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { initPersist } from '@/services/offline/persist';
import { initNetworkListener } from '@/services/offline/network';

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

  useEffect(() => {
    const unsubscribeNetwork = initNetworkListener();
    void initPersist(client);
    return () => {
      unsubscribeNetwork?.();
    };
  }, [client]);

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
