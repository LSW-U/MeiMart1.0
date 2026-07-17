import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';

const REACT_QUERY_KEY = 'meimart-react-query';

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: REACT_QUERY_KEY,
  throttleTime: 1000,
});

export async function initPersist(client: QueryClient) {
  // Why: 未登录时清除持久化数据，避免恢复的缓存触发 401 错误
  // 场景：用户重置后重新启动，React Query 恢复的 pending 查询会立即请求，
  // 但此时用户未登录，导致 401。
  const isAuthenticated = useAuthStore.getState().isAuthenticated;
  if (!isAuthenticated) {
    await AsyncStorage.removeItem(REACT_QUERY_KEY);
    client.clear();
  }

  // persistQueryClient 是同步调用，返回 persister 对象
  persistQueryClient({
    queryClient: client,
    persister: asyncStoragePersister,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    buster: 'meimart-v4', // Why: v3 缓存可能有 pending 查询，升级 v4 强制清除
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        // Why: 不持久化 pending 状态的查询，避免恢复时触发 CancelledError
        // pending 查询恢复时会重新请求，但如果组件未挂载或被取消，会抛 CancelledError
        if (query.state.status === 'pending') return false;
        const queryKey = query.queryKey[0] as string;
        const excluded = ['auth', 'notifications', 'product', 'products'];
        return !excluded.includes(queryKey);
      },
    },
  });
}
