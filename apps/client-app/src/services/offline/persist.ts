import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';
import { queryClient as appQueryClient } from '@/providers/queryClient';
import { useAuthStore } from '@/store/authStore';
import { isMockMode } from '@/services/api';

const REACT_QUERY_KEY = 'meimart-react-query';

// C-P1-4: 登出时显式清持久化缓存（PII 泄露治理）——clearAuth 只翻内存状态，
// AsyncStorage 里上一次 persist throttle 落盘的用户数据（profile/notifications 等）不会自动消失。
// queryClient.clear() 同步清内存缓存，防止登出后 60s staleTime 内页面仍渲染旧用户数据。
export async function clearPersistedQueryCache(
  client: QueryClient = appQueryClient,
): Promise<void> {
  client.clear();
  await AsyncStorage.removeItem(REACT_QUERY_KEY);
}

// C-P1-4: 排除表改「前两段精确匹配」。旧实现只匹配 queryKey[0]：
//   - ['user','notifications'] / ['user','profile'] 首段是 'user'，全部漏网 → PII（手机号/
//     通知正文）随缓存落盘 7 天；
//   - ['product', id] 想排除但 'products' 前缀误伤同前缀的非敏感键，语义混乱。
// 表语义：`['user','notifications']` = 精确排除这两段开头；`['auth']` = 排除首段 auth。
// 现有 queryKey 盘点（2026-09-30）：auth 无持久化查询（登录态走 zustand）仍保留防御；
// user:* 全部 PII/私有（profile/favorites/notifications/notification-preferences）——
// favorites 虽非严格 PII 也属登录后私有数据，整组排除。
const EXCLUDED_PREFIXES: readonly (readonly string[])[] = [
  ['auth'],
  ['user', 'notifications'],
  ['user', 'notification-preferences'],
  ['user', 'profile'],
  ['user', 'favorites'],
];

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: REACT_QUERY_KEY,
  throttleTime: 1000,
});

export function initPersist(client: QueryClient) {
  // Why: 未登录时清除持久化数据，避免恢复的缓存触发 401 错误
  // 场景：用户重置后重新启动，React Query 恢复的 pending 查询会立即请求，
  // 但此时用户未登录，导致 401。
  const isAuthenticated = useAuthStore.getState().isAuthenticated;
  if (!isAuthenticated) {
    void clearPersistedQueryCache(client);
  }

  // persistQueryClient 是同步调用，返回 persister 对象
  persistQueryClient({
    queryClient: client,
    persister: asyncStoragePersister,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    // Why: buster 绑定 isMockMode —— mock/real 切换时 buster 变化，AsyncStorage 旧缓存自动失效。
    // 避免切 real 后仍读到 mock 模式持久化的分类/购物车等数据（如 mock 分类无美妆，导致看不到美妆分类）。
    buster: isMockMode ? 'meimart-v5-mock' : 'meimart-v5-real',
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        // Why: 不持久化 pending 状态的查询，避免恢复时触发 CancelledError
        // pending 查询恢复时会重新请求，但如果组件未挂载或被取消，会抛 CancelledError
        if (query.state.status === 'pending') return false;
        // C-P1-4: 前两段精确匹配（见 EXCLUDED_PREFIXES 注释）
        const key = query.queryKey as readonly unknown[];
        const first = typeof key[0] === 'string' ? key[0] : undefined;
        const second = typeof key[1] === 'string' ? key[1] : undefined;
        return !EXCLUDED_PREFIXES.some(
          ([a, b]) => first === a && (b === undefined || second === b),
        );
      },
    },
  });
}
