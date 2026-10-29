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
 * - 防连点：返回的 fetchNextPage 在 isFetchingNextPage 期间忽略重复点击
 *   （RQ v5 对同页请求本身去重，这里显式守卫对齐页面层 handleLoadMore 范式）。
 * - placeholderData 策略可配（D4）：默认恒 undefined——换 key（换批/回绕）瞬间露
 *   loading 态，防旧 key 的多页列表被顶到新 key 渲染（20261024「换一批收不回去」实证）；
 *   同 key 追加翻页不经过该路径，翻页无闪烁。需要「换筛选保旧列表」的查询传
 *   keepPreviousData: true（如搜索换 keyword）。
 */
interface OffsetInfiniteOptions<T> {
  /** 完整 queryKey（含 baseOffset/cycle 等批次维度段，由调用方经 factory 构建） */
  queryKey: QueryKey;
  /** 取一页：入参 = 本页 offset（批内相对值，baseOffset 由闭包折叠） */
  fetchPage: (offset: number) => Promise<T[]>;
  /** 页长（满页判定阈值，必须与后端 limit 一致） */
  limit: number;
  enabled?: boolean;
  /** true → placeholderData keepPreviousData（换 key 保旧列表）；默认 undefined（换 key 露 loading） */
  keepPreviousData?: boolean;
  staleTime?: number;
}

export function useOffsetInfinite<T>({
  queryKey,
  fetchPage,
  limit,
  enabled = true,
  keepPreviousData = false,
  staleTime,
}: OffsetInfiniteOptions<T>) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === limit ? allPages.length * limit : undefined,
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
