import { ThemeProvider } from '@/theme/ThemeProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60 * 1000,
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
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
