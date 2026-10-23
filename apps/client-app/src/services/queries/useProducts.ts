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
 * - queryKey 含 baseOffset 位（D3 方案 B → 20261023 real 模式修订）：换一批 = baseOffset+=limit
 *   （短批回绕 0，由页面层维护推进），换到的真是后面一批商品——原 epoch 方案在 real 模式下
 *   失效：后端确定性排序（salesCount desc）使 offset=0 每次返回同一批，epoch++ 重查后
 *   placeholderData 保持旧列表 + 新数据相同 → 感知「没反应」（20261023 人工验收实证）
 * - 精确匹配零跨页副作用（resetQueries 前缀会误伤 cart 的 ['products','recommend',n]，故弃 A）
 * - placeholderData 恒 undefined（20261024 人工验收实证「换一批后全商品显示收不回去」）：
 *   原保占位把旧 key 的多页列表（含加载到底 70 条）顶到新 key 渲染，换一批瞬间页面不收缩、
 *   连点推进期间一直全量。改恒不占位——换 key 瞬间露 loading 态（换批过渡可感知，合理）；
 *   fetchNextPage 是同 key 追加不经过此路径，翻页无闪烁不受影响
 * - 旧 useRecommendations 保留并存（cart.tsx:67 消费中，cart 不切）
 */
export function useRecommendationsInfinite(opts?: {
  limit?: number;
  baseOffset?: number;
  cycle?: number;
}) {
  const limit = opts?.limit ?? 6;
  const baseOffset = opts?.baseOffset ?? 0;
  return useInfiniteQuery({
    // Why: cycle 进 queryKey——baseOffset 回绕 0 时旧 key(0) 缓存里可能存着用户之前
    //   加载到底的多页数据（staleTime 5min 内直接复用），换一批会「显示全部且无按钮」；
    //   cycle++ 使回绕后的 key 全新，从 6 条干净起步（20261023 人工验收实证）
    queryKey: ['products', 'recommend-infinite', baseOffset, opts?.cycle ?? 0, limit],
    queryFn: ({ pageParam }) =>
      productApi.getRecommendations({ limit, offset: baseOffset + pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === limit ? allPages.length * limit : undefined,
    // Why: 占位只在「同 key 翻页链」保留——placeholderData 仅在新 key 无数据时被调用，
    //   返回 previous 会把旧 key 的多页列表（含加载到底的 70 条）原样顶到新 key 渲染
    //   （20261024 人工验收实证「换一批后全商品显示收不回去」）。换一批/回绕都是换 key
    //   → 必须返回 undefined 露出 loading 态；fetchNextPage 是同 key 追加，不经过此路径。
    placeholderData: () => undefined,
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
