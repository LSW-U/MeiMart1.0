import type { ReactNode } from 'react';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const baseQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60 * 1000,
      gcTime: 1000 * 60 * 60 * 24,
      networkMode: 'offlineFirst',
      refetchOnWindowFocus: false,
    },
    mutations: {
      // 骑手端配送状态上报需要离线队列支持（CLAUDE.md 弱网规则 #12）
      networkMode: 'offlineFirst',
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(() => baseQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
