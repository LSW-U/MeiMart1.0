import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { isAxios401 } from '@/utils/error';
import { useAuthStore } from '@/store/authStore';

// Why: T2-B 全局 401 查询处理。到达 query/mutation 层的 401 一定是终态 —— interceptor（api.ts）
// 对非终态 401 要么已 refresh 重发（不 reject）、要么在 pendingQueue 排队。
// 这里只负责把「终态 401」翻转成 clearAuth（幂等 set），后续清缓存/toast/跳登录全部
// 复用 RootAuthGate 单一 Owner（app/_layout.tsx），不在 axios 层外再造第二套跳转逻辑。
// 覆盖缺口：A) refresh 成功但重发仍 401（_retry reject 不走 interceptor clearAuth 分支）
//          B) 公开页鉴权 query（如商品详情 useFavorites）401 时无提示。
// MutationCache 同接 onError（审查 Q2）：mutation 收终态 401 后全局先翻 clearAuth
// （v5 全局先跑、局部 onError 后跑，不抢局部 toast 四件套），消除 query 兜底不到的路径盲区。
export function handleQueryError(error: unknown): void {
  if (isAxios401(error)) {
    useAuthStore.getState().clearAuth();
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleQueryError,
  }),
  // 终态 401 mutation 同样翻 clearAuth（addToCart/submitReview 等，否则用户停在页面持续 401）
  mutationCache: new MutationCache({
    onError: handleQueryError,
  }),
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
