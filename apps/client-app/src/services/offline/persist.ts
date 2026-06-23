import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'meimart-react-query',
  throttleTime: 1000,
});

export function initPersist(client: QueryClient) {
  return persistQueryClient({
    queryClient: client,
    persister: asyncStoragePersister,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    buster: 'meimart-v2',
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        const queryKey = query.queryKey[0] as string;
        const excluded = ['auth', 'notifications', 'product', 'products'];
        return !excluded.includes(queryKey);
      },
    },
  });
}
