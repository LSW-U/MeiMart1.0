import { createTRPCUntypedClient, httpBatchLink, loggerLink } from '@trpc/client';
import superjson from 'superjson';

import { API_BASE_URL, getAuthToken } from './api';

export const trpcClient = createTRPCUntypedClient({
  links: [
    loggerLink({
      enabled: () => __DEV__,
    }),
    httpBatchLink({
      url: `${API_BASE_URL}/trpc`,
      transformer: superjson,
      headers: () => {
        const token = getAuthToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
