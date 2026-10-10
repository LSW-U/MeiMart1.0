import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';

import { queryClient as appQueryClient } from '@/providers/queryClient';

const REACT_QUERY_KEY = 'meimart-react-query';

// 第四轮修复 P1-1（D3）：登出清持久化缓存抽到独立小模块——
// persist.ts 原同时 import queryClient + authStore（authStore→tokenStorage→api→authStore
// 才是真环，persist 多挂一个下游），clearAuth 收口「内直调」需反向 import persist 会闭环。
// 本模块仅依赖 AsyncStorage + queryClient（无 authStore），authStore 可安全 import。
// persist.ts 保留 re-export 兼容既有测试/引用。

// C-P1-4: 登出时显式清持久化缓存（PII 泄露治理）——clearAuth 只翻内存状态，
// AsyncStorage 里上一次 persist throttle 落盘的用户数据（profile/notifications 等）不会自动消失。
// queryClient.clear() 同步清内存缓存，防止登出后 60s staleTime 内页面仍渲染旧用户数据。
export async function clearPersistedQueryCache(
  client: QueryClient = appQueryClient,
): Promise<void> {
  client.clear();
  await AsyncStorage.removeItem(REACT_QUERY_KEY);
}
