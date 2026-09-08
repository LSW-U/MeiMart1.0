import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { productApi } from '@/services/products';

/**
 * 排序方式（P8 决策 2-B 后端排序，与后端 ProductSortBy enum 一致）
 * - all 综合 / bestSelling 销量 / priceAsc 价格升 / newArrivals 上新
 */
export type ProductSortKey = 'all' | 'bestSelling' | 'priceAsc' | 'newArrivals';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => productApi.getProducts(),
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => productApi.getProduct(id as string),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}

export function useRecommendations() {
  return useQuery({
    queryKey: ['products', 'recommend'],
    queryFn: () => productApi.getRecommendations(),
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}

export function useBuyAgain() {
  return useQuery({
    queryKey: ['products', 'buy-again'],
    queryFn: () => productApi.getBuyAgain(),
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}

/**
 * 搜索结果无限分页 hook（P8 决策 2-B 后端排序 + 决策 3-B 真实分页）
 *
 * - sortBy 变 → queryKey 变 → 自动重查第一页（切换排序触发重新搜索）
 * - onEndReached 调 fetchNextPage 取下一页（getNextPageParam 按 hasMore 判断）
 * - mock 模式 hasMore=false，不触发第二页（一次性返全部）
 * - pages.flatMap(p => p.items) 拼接所有已加载页；pages[0].total 是搜索结果总数
 */
export function useProductSearch(keyword: string, sortBy: ProductSortKey = 'all') {
  return useInfiniteQuery({
    queryKey: ['products', 'search', keyword, sortBy],
    queryFn: ({ pageParam }) => productApi.search(keyword, { page: pageParam, sortBy }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length + 1 : undefined),
    enabled: keyword.trim().length > 0,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    networkMode: 'offlineFirst',
  });
}

export function useProductsByCategory(categoryId: string | undefined) {
  return useQuery({
    queryKey: ['products', 'category', categoryId],
    queryFn: () => productApi.getByCategory(categoryId as string),
    enabled: Boolean(categoryId),
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}

/**
 * 批D D5 就近仓可用性（默认地址坐标查询；商品详情页消费）
 *
 * - lat/lng 缺失（未登录无地址 / 地址未选地图坐标）→ enabled=false，不查询，UI 隐藏该区块
 * - data 为 null = 本次无数据（端点未部署门禁 / 商品不存在 / 端点异常降级），UI 同样隐藏
 * - queryKey 带坐标：地址变更（切默认地址）自动重查
 */
export function useWarehouseAvailability(
  id: string | undefined,
  lat: number | null,
  lng: number | null,
) {
  return useQuery({
    queryKey: ['product', id, 'warehouse-availability', lat, lng],
    queryFn: () => productApi.getWarehouseAvailability(id as string, lat as number, lng as number),
    enabled: Boolean(id) && lat != null && lng != null,
    staleTime: 60 * 1000,
    networkMode: 'offlineFirst',
  });
}
