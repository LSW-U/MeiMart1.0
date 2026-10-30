import { useCallback, useRef } from 'react';
import { useInfiniteQuery, keepPreviousData as rqKeepPreviousData } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';

/**
 * 通用 offset 分页 hook（数据层工程治理 批2 D4，方案v2 20261029）
 *
 * 与 usePagination（page 式，initialPageParam 1 + hasMore）语义不同，两者并存不合并
 * （D4 拍板：page 式语义不同，保留不动）。
 *
 * - offset 分页：initialPageParam 0，pageParam 即 offset，queryFn 收到后自行折叠
 *   baseOffset（若有的话）——hook 不感知 baseOffset/cycle，它们由调用方折进 queryKey
 *   与 fetchPage 闭包（见 useRecommendationsInfinite：换批/回绕换 key 语义留在消费方）。
 * - 满页短批终止：getNextPageParam 按页长判定——满页（length === limit）才有下一页，
 *   短批/空批 → undefined（响应无 hasMore 字段也可用，E6 红线零新增字段前提）。
 *   页形态两种（前端接线批 批1 D3 20261030 扩展）：数组页（recommendations，页=TItem[]）
 *   与对象页（search，页={items,total,...}，传 itemsOf 提业务数组，保消费方 pages 形状不变）。
 * - 防连点：返回的 fetchNextPage 在 isFetchingNextPage 期间忽略重复点击
 *   （RQ v5 对同页请求本身去重，这里显式守卫对齐页面层 handleLoadMore 范式）。
 * - placeholderData 策略可配（D4）：默认恒 undefined——换 key（换批/回绕）瞬间露
 *   loading 态，防旧 key 的多页列表被顶到新 key 渲染（20261024「换一批收不回去」实证）；
 *   同 key 追加翻页不经过该路径，翻页无闪烁。需要「换筛选保旧列表」的查询传
 *   keepPreviousData: true（如搜索换 keyword）。
 */
interface OffsetInfiniteOptions<TItem, TPage> {
  /** 完整 queryKey（含 baseOffset/cycle 等批次维度段，由调用方经 factory 构建） */
  queryKey: QueryKey;
  /** 取一页：入参 = 本页 offset（批内相对值，baseOffset 由闭包折叠） */
  fetchPage: (offset: number) => Promise<TPage>;
  /**
   * 对象页的页长提取（前端接线批 批1 D3 20261030 新增，向后兼容）：
   * 页对象非数组时（如 search 的 {items,total,hasMore}，响应与 useInfiniteQuery
   * 时代形状一致，消费方 pages.flatMap(p=>p.items) 零改动）传 itemsOf 取业务数组；
   * 缺省时页即 TItem[] 数组（recommendations 等既有消费方路径不变）。
   */
  itemsOf?: (page: TPage) => TItem[];
  /** 页长（满页判定阈值，必须与后端 limit 一致） */
  limit: number;
  enabled?: boolean;
  /** true → placeholderData keepPreviousData（换 key 保旧列表）；默认 undefined（换 key 露 loading） */
  keepPreviousData?: boolean;
  staleTime?: number;
}

/**
 * 返回类型（前端接线批 批1 P2-1 修复 20261031）：继承 RQ infinite 全部键，
 * fetchNextPage 单独收窄为守卫后签名——guardedFetchNextPage 防连点命中时同步返回
 * void（不排队），显式声明避免消费方误拿「恒为 Promise」的错觉。
 */
type OffsetInfiniteResult<TPage> = Omit<
  ReturnType<typeof useInfiniteQuery<TPage>>,
  'fetchNextPage'
> & { fetchNextPage: () => void };

/**
 * 重载签名（前端接线批 批1 P2-1 修复 20261031）：两个互斥形态由 TS 重载各自约束，
 * 实现内部 itemsOf 缺省分支的「页必为数组」前提落在重载约束上，不再需要断言。
 * - 数组页：TPage=TItem[]，禁止传 itemsOf（有 itemsOf 即对象页形态，重载不匹配）
 * - 对象页：显式 TPage + 必传 itemsOf，返回 data.pages 为 TPage[]（消费方形状不变）
 */
export function useOffsetInfinite<TItem>(
  options: Omit<OffsetInfiniteOptions<TItem, TItem[]>, 'itemsOf'>,
): OffsetInfiniteResult<TItem[]>;
export function useOffsetInfinite<TItem, TPage>(
  options: OffsetInfiniteOptions<TItem, TPage> & {
    itemsOf: (page: TPage) => TItem[];
  },
): OffsetInfiniteResult<TPage>;
export function useOffsetInfinite<TItem, TPage = TItem[]>({
  queryKey,
  fetchPage,
  itemsOf,
  limit,
  enabled = true,
  keepPreviousData = false,
  staleTime,
}: OffsetInfiniteOptions<TItem, TPage>): OffsetInfiniteResult<TPage> {
  // Why: 满页判定统一走 toItems——数组页恒 length（重载 1 约束 TPage=TItem[] 且无
  //   itemsOf）；对象页取 itemsOf(页).length（重载 2 约束 itemsOf 必传）。
  //   数组分支的断言由重载约束背书（实现签名内部收口，规则 36 禁的是 as any/
  //   as unknown as 双跳板，此处单步交集断言带原因注释）。
  const toItems = useCallback(
    (page: TPage): TItem[] => (itemsOf ? itemsOf(page) : (page as TItem[] & TPage)),
    [itemsOf],
  );

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      toItems(lastPage).length === limit ? allPages.length * limit : undefined,
    enabled,
    // Why: 占位只允许显式开启——默认 undefined 防旧 key 多页列表顶到新 key
    //   （useRecommendationsInfinite 20261024 人工验收实证，见文件头）
    placeholderData: keepPreviousData ? rqKeepPreviousData : undefined,
    staleTime,
    networkMode: 'offlineFirst',
  });

  // 防连点：追加中忽略重复 fetchNextPage（页面层 handleLoadMore 同款守卫下沉到 hook）。
  // Why: 双保险——isFetchingNextPage 覆盖请求在途窗口；refetching 标志覆盖「连点发生在
  //   同一事件帧内、observer 尚未把 isFetchingNextPage 翻 true」的缝隙（测试实证：
  //   同帧三次调用会三连发 fetchNextPage，RQ v5 对 infinite 不做请求级去重）。
  const fetchingRef = useRef(false);
  const guardedFetchNextPage = useCallback(() => {
    if (fetchingRef.current || query.isFetchingNextPage) return;
    fetchingRef.current = true;
    void query
      .fetchNextPage()
      .catch(() => undefined)
      .finally(() => {
        fetchingRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 原因：query 对象每渲染新引用，依其子字段（isFetchingNextPage/fetchNextPage）已列全，整对象入依赖会每次渲染重建回调
  }, [query.isFetchingNextPage, query.fetchNextPage]);

  return { ...query, fetchNextPage: guardedFetchNextPage };
}
