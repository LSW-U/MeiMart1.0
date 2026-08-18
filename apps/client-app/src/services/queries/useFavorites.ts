import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoritesApi } from '@/services/favorites';
import { useAuthStore } from '@/store/authStore';
import type { Product } from '@/types';

// Why: 从 useUser.ts 拆出来，favorites 模块自包含（service + hook 都在）
export const FAVORITES_QUERY_KEY = ['user', 'favorites'] as const;

export function useFavorites() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: FAVORITES_QUERY_KEY,
    queryFn: () => favoritesApi.list(),
    staleTime: 60 * 1000,
    networkMode: 'offlineFirst',
    enabled: isAuthenticated, // 未登录时不请求
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    // Why: 旧版 mutationFn 接 Product 对象（兼容组件层调用），service 只需 productId
    mutationFn: (product: Product) => favoritesApi.toggle(product.id),
    onMutate: async (product) => {
      await qc.cancelQueries({ queryKey: FAVORITES_QUERY_KEY });
      const previous = qc.getQueryData<Product[]>(FAVORITES_QUERY_KEY);
      qc.setQueryData<Product[]>(FAVORITES_QUERY_KEY, (old) => {
        if (!old) return old;
        const exists = old.some((p) => p.id === product.id);
        // Why: 乐观加入时直接用组件传入的 product 对象（已含完整字段），避免额外 fetch
        return exists ? old.filter((p) => p.id !== product.id) : [...old, product];
      });
      return { previous };
    },
    onError: (_err, _product, ctx) => {
      if (ctx?.previous) qc.setQueryData(FAVORITES_QUERY_KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY }),
  });
}

// Why: P19 D1 批量删除 —— 后端无 batch-remove 端点，第一期并行 toggle（方案 D1）。
//      toggle 非幂等（在收藏则移除/不在则加回），Promise.all 任一失败整体回滚会让已成功移除的项
//      在重试时被反向加回（审查 Q2）—— 故用 allSettled：失败项局部加回 cache，成功项保持移除。
//      返回失败 id 列表供页面 toast 分流（全部成功 / 部分成功 / 全部失败）。
export function useRemoveFavorites() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (productIds: string[]): Promise<{ failedIds: string[]; okCount: number }> => {
      const results = await Promise.allSettled(
        productIds.map((id) => favoritesApi.toggle(id)),
      );
      const failedIds = productIds.filter(
        (_, i) => results[i].status === 'rejected',
      );
      return { failedIds, okCount: productIds.length - failedIds.length };
    },
    onMutate: async (productIds) => {
      await qc.cancelQueries({ queryKey: FAVORITES_QUERY_KEY });
      const previous = qc.getQueryData<Product[]>(FAVORITES_QUERY_KEY);
      qc.setQueryData<Product[]>(FAVORITES_QUERY_KEY, (old) => {
        if (!old) return old;
        const remove = new Set(productIds);
        return old.filter((p) => !remove.has(p.id));
      });
      return { previous };
    },
    onError: (_err, productIds, ctx) => {
      // Why: Q2 局部回滚 —— allSettled 语义下 mutationFn 不 reject（网络层错误也被吸收），
      //      此分支仅防御未预期异常；真正的失败项恢复在页面 onSuccess 里按 failedIds 精确加回
      if (ctx?.previous) qc.setQueryData(FAVORITES_QUERY_KEY, ctx.previous);
    },
    onSuccess: ({ failedIds }, _productIds, ctx) => {
      if (failedIds.length > 0 && ctx?.previous) {
        // 只把失败的项从快照加回（成功的保持移除，避免幽灵项）
        qc.setQueryData<Product[]>(FAVORITES_QUERY_KEY, (old) => {
          const failed = new Set(failedIds);
          const restore = (ctx.previous ?? []).filter((p) => failed.has(p.id));
          const existing = new Set((old ?? []).map((p) => p.id));
          return [...(old ?? []), ...restore.filter((p) => !existing.has(p.id))];
        });
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY }),
  });
}
