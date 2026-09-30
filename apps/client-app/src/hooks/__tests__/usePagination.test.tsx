/**
 * usePagination 最小用例（批4 C-P3-11：pageSize 死参数删除后的基线覆盖）
 *
 * 仅覆盖入参透传契约：queryKey/queryFn/enabled 传给 useInfiniteQuery，
 * getNextPageParam 按 hasMore 决定是否翻页。RQ 渲染细节（isLoading 等）
 * 由 @tanstack/react-query 自身保证，不在此重复。
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { usePagination } from '../usePagination';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('usePagination', () => {
  it('首页 pageParam=1，hasMore=true → 下一页 2；hasMore=false → 停止翻页', async () => {
    const queryFn = jest
      .fn()
      .mockResolvedValueOnce({ items: ['a'], hasMore: true })
      .mockResolvedValueOnce({ items: ['b'], hasMore: false });

    const { result } = renderHook(
      () => usePagination<string>({ queryKey: ['test', 'pagination'], queryFn }),
      { wrapper },
    );

    await waitFor(() =>
      expect(result.current.data?.pages).toEqual([{ items: ['a'], hasMore: true }]),
    );
    expect(queryFn).toHaveBeenCalledWith(1);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));

    // hasMore=false → getNextPageParam 返回 undefined → hasNextPage 关闭
    expect(result.current.hasNextPage).toBe(false);
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it('enabled=false 不发请求', () => {
    const queryFn = jest.fn();
    const { result } = renderHook(
      () => usePagination({ queryKey: ['test', 'disabled'], queryFn, enabled: false }),
      { wrapper },
    );
    expect(result.current.data).toBeUndefined();
    expect(queryFn).not.toHaveBeenCalled();
  });
});
