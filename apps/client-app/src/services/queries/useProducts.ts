import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { productApi, type FrequentBundle } from '@/services/products';
import { useAuthStore } from '@/store/authStore';

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

// Why: 换一批按钮 批2（方案v2 20261017）——offset 进 queryKey 分批缓存（放弃 refetch 方案：
//   refetch 只能刷当前批，无法表达「看第 2 批」）；批间缓存天然隔离，翻回上一批吃缓存。
export function useRecommendations(opts?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['products', 'recommend', opts?.offset ?? 0],
    queryFn: () => productApi.getRecommendations(opts),
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}

/**
 * 首页推荐展示 批2（方案v2 20261017）——追加式真分页 hook（home 推荐板块消费）
 *
 * - pageParam=offset（D1 沿用后端 offset/limit 形态），initialPageParam 0
 * - 响应无 hasMore（E6 红线零新增字段），getNextPageParam 按页长判定：满页才有下一页，
 *   短批/空批 → undefined（mock 池 15 条：6+6+3 短批到底，D5）
 * - queryKey 含 epoch 位（D3 方案 B）：换一批 = epoch++，回首屏复位；
 *   精确匹配零跨页副作用（resetQueries 前缀会误伤 cart 的 ['products','recommend',n]，故弃 A）
 * - 旧 useRecommendations 保留并存（cart.tsx:67 消费中，cart 不切）
 */
export function useRecommendationsInfinite(opts?: { limit?: number; epoch?: number }) {
  const limit = opts?.limit ?? 6;
  return useInfiniteQuery({
    queryKey: ['products', 'recommend-infinite', opts?.epoch ?? 0, limit],
    queryFn: ({ pageParam }) => productApi.getRecommendations({ limit, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === limit ? allPages.length * limit : undefined,
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}

export function useBuyAgain(opts?: { limit?: number; offset?: number; enabled?: boolean }) {
  return useQuery({
    queryKey: ['products', 'buy-again', opts?.offset ?? 0],
    queryFn: () => productApi.getBuyAgain(opts),
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
    // 批3 P2-2：默认 true（home 换一批对匿名照常出销量切片）；B1 清单页传
    // enabled: isAuthenticated——匿名不请求（后端兜底切片不是「你常买的」，白打+错位展示）
    enabled: opts?.enabled ?? true,
  });
}

/**
 * 客户画像批3 B8 常买组合（方案v2 §三 批3 2026-10-18）
 *
 * - 可选登录端点（OptionalAuth + no-store，同 buy-again 范式）：匿名/无历史/无共现返回空组合
 *   （seed null + items []），消费方按空组合整块隐藏
 * - queryKey 独立段（不进 buy-again 前缀，语义不同：组合 vs 清单）
 * - staleTime 5min 与 buy-again 同款（no-store 只约束 HTTP 缓存，RQ 内存缓存照常）
 */
export function useFrequentBundle(limit = 5) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<FrequentBundle>({
    queryKey: ['products', 'frequent-bundle', limit],
    queryFn: () => productApi.getFrequentBundle(limit),
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
    // 匿名不请求（端点匿名也返空组合，但省一次请求；登录后自动重查）
    enabled: isAuthenticated,
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
