import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, type RenderHookOptions } from '@testing-library/react-native';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 0, networkMode: 'offlineFirst' },
      mutations: { retry: false, networkMode: 'offlineFirst' },
    },
  });
}

export function createQueryClientWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

export function renderHookWithClient<T, P>(
  hook: (props: P) => T,
  queryClient: QueryClient,
  initialProps?: P,
) {
  const wrapper = createQueryClientWrapper(queryClient);
  const options: RenderHookOptions<P> = { wrapper };
  if (initialProps !== undefined) options.initialProps = initialProps;
  return renderHook(hook, options);
}
