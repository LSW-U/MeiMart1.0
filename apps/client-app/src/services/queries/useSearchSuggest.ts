import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { searchSuggestApi } from '@/services/searchSuggest';
import { productApi } from '@/services/products';
import type { Product } from '@/types';

/**
 * 搜索词联想 hook - C方案 §4.2（双 hook 并行之 1：词联想）
 *
 * - debounce 300ms 后由调用方传 debounced 值（search/index.tsx 用 useDebounce）
 * - ≥ 2 字符才联想（单字符噪音大，方案 §4.1）
 * - staleTime 60s（同一 prefix 1 分钟内不重查）+ offlineFirst（弱网降级）
 * - keepPreviousData：输入变化时保留旧建议防闪烁
 * - 失败隐藏词区（方案 §4.5 状态机，不影响商品联想独立显示）
 */
export function useSearchSuggest(prefix: string, enabled = true) {
  return useQuery({
    queryKey: ['search-suggest', prefix],
    queryFn: () => searchSuggestApi.getSuggest(prefix, 5),
    enabled: enabled && prefix.trim().length >= 2,
    staleTime: 60 * 1000,
    networkMode: 'offlineFirst',
    placeholderData: keepPreviousData,
  });
}

/**
 * 搜索商品联想 hook - C方案 §4.2（双 hook 并行之 2：商品联想）
 *
 * - 复用 productApi.search（pageSize=3，依赖 F1 已修 pageSize 透传）
 * - 独立于词联想 hook，谁先回谁先显示；词联想失败/空时商品联想仍独立可用（方案 §8）
 * - queryFn 内取 res.items（search 返 { items, hasMore, total }，联想只用 items top 3）
 */
export function useSearchProductsSuggest(prefix: string, enabled = true) {
  return useQuery<Product[]>({
    queryKey: ['search-products-suggest', prefix],
    queryFn: async () => {
      const res = await productApi.search(prefix, { pageSize: 3 });
      return res.items;
    },
    enabled: enabled && prefix.trim().length >= 2,
    staleTime: 60 * 1000,
    networkMode: 'offlineFirst',
    placeholderData: keepPreviousData,
  });
}
