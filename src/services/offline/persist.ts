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
    buster: 'meimart-v1',
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        const queryKey = query.queryKey[0];
        return queryKey !== 'auth' && queryKey !== 'notifications';
      },
    },
  });
}
