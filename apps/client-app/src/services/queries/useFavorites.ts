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
//      乐观整体移除（一次 setQueryData，不闪烁）；Promise.all 语义：任一失败即整体失败，
//      onError 回滚 previous，页面保留选择集合可重试（不做静默部分成功）。
export function useRemoveFavorites() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (productIds: string[]) => {
      await Promise.all(productIds.map((id) => favoritesApi.toggle(id)));
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
    onError: (_err, _productIds, ctx) => {
      if (ctx?.previous) qc.setQueryData(FAVORITES_QUERY_KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY }),
  });
}
