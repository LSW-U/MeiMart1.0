import { useInfiniteQuery } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';

interface PaginationOptions<T> {
  queryKey: QueryKey;
  queryFn: (page: number) => Promise<{ items: T[]; hasMore: boolean }>;
  enabled?: boolean;
  pageSize?: number;
}

export function usePagination<T>({ queryKey, queryFn, enabled = true }: PaginationOptions<T>) {
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => queryFn(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length + 1 : undefined),
    enabled,
    networkMode: 'offlineFirst',
  });
}
