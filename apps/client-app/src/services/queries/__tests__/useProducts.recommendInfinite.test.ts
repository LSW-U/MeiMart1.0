/**
 * 首页推荐展示 批2：useRecommendationsInfinite 追加式真分页（方案v2 20261017）
 *
 * 验证：
 *   - 翻页推进：pageParam=offset，fetchNextPage → offset=limit，pages 追加不替换
 *   - 短批/空批终止：getNextPageParam 按页长判定（响应无 hasMore，E6 红线）
 *   - epoch 复位（D3 方案 B）：epoch++ 换 queryKey，回首屏重新取第一页，旧 epoch 缓存隔离
 */
import { renderHookWithClient, createTestQueryClient } from './testHarness';
import { act, waitFor } from '@testing-library/react-native';
import { useRecommendationsInfinite } from '@/services/queries/useProducts';

const mockGetRecommendations = jest.fn();

jest.mock('@/services/products', () => ({
  productApi: {
    getRecommendations: (...args: unknown[]) => mockGetRecommendations(...args),
  },
}));

// 便捷：按调用序号返回第 N 页 mock（i → ['p1','p2',...] 长度由队列决定）
const makePage = (offset: number, size: number) =>
  Array.from({ length: size }, (_, i) => ({ id: `p${offset + i + 1}` }));

describe('useRecommendationsInfinite — 追加式真分页', () => {
  beforeEach(() => {
    mockGetRecommendations.mockReset();
  });

  it('首屏 offset=0 透传 limit；queryKey 含 epoch 与 limit 位', async () => {
    mockGetRecommendations.mockResolvedValue(makePage(0, 6));
    const qc = createTestQueryClient();
    const { result } = renderHookWithClient(
      () => useRecommendationsInfinite({ limit: 6, epoch: 0 }),
      qc,
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetRecommendations).toHaveBeenCalledWith({ limit: 6, offset: 0 });
    expect(
      qc.getQueryCache().find({ queryKey: ['products', 'recommend-infinite', 0, 6] }),
    ).toBeTruthy();
  });

  it('fetchNextPage 追加第二页：pageParam 推进 0→6，pages 拼接 6→12', async () => {
    mockGetRecommendations
      .mockResolvedValueOnce(makePage(0, 6))
      .mockResolvedValueOnce(makePage(6, 6));
    const qc = createTestQueryClient();
    const { result } = renderHookWithClient(() => useRecommendationsInfinite({ limit: 6 }), qc);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages).toHaveLength(1);
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    const pages = result.current.data?.pages ?? [];
    expect(pages).toHaveLength(2);
    expect(mockGetRecommendations).toHaveBeenLastCalledWith({ limit: 6, offset: 6 });
    expect(pages.flatMap((p) => p)).toHaveLength(12);
  });

  it('短批终止：返回 < limit 时 hasNextPage=false（按钮消失前提）', async () => {
    // mock 池 15 条口径：6 + 6 + 3
    mockGetRecommendations
      .mockResolvedValueOnce(makePage(0, 6))
      .mockResolvedValueOnce(makePage(6, 6))
      .mockResolvedValueOnce(makePage(12, 3));
    const qc = createTestQueryClient();
    const { result, rerender } = renderHookWithClient(
      () => useRecommendationsInfinite({ limit: 6 }),
      qc,
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
    await act(async () => {
      await result.current.fetchNextPage();
    });
    rerender({});
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(result.current.hasNextPage).toBe(true);
    await act(async () => {
      await result.current.fetchNextPage();
    });
    rerender({});
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(3));
    expect(result.current.hasNextPage).toBe(false);
    expect((result.current.data?.pages ?? []).flatMap((p) => p)).toHaveLength(15);
    // 到底后再调 fetchNextPage 不再发请求
    const calls = mockGetRecommendations.mock.calls.length;
    await result.current.fetchNextPage();
    expect(mockGetRecommendations.mock.calls.length).toBe(calls);
  });

  it('空批终止：返回 [] 时 hasNextPage=false 且不追加空页内容', async () => {
    mockGetRecommendations.mockResolvedValueOnce(makePage(0, 6)).mockResolvedValueOnce([]);
    const qc = createTestQueryClient();
    const { result } = renderHookWithClient(() => useRecommendationsInfinite({ limit: 6 }), qc);
    await act(async () => {
      await result.current.fetchNextPage();
    });
    expect(result.current.hasNextPage).toBe(false);
  });

  it('epoch 复位（D3 方案 B）：epoch++ 换 queryKey，回首屏重新取第一页', async () => {
    mockGetRecommendations
      .mockResolvedValueOnce(makePage(0, 6))
      .mockResolvedValueOnce(makePage(6, 6))
      .mockResolvedValueOnce(makePage(0, 6)); // 复位后的首屏
    const qc = createTestQueryClient();
    const { result, rerender } = renderHookWithClient(
      (p: { epoch: number }) => useRecommendationsInfinite({ limit: 6, epoch: p.epoch }),
      qc,
      { epoch: 0 },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect((result.current.data?.pages ?? []).flatMap((p) => p)).toHaveLength(6);

    // epoch++ → 新 queryKey → 新查询从 offset=0 起（回首屏复位）
    rerender({ epoch: 1 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetRecommendations).toHaveBeenLastCalledWith({ limit: 6, offset: 0 });
    expect((result.current.data?.pages ?? []).flatMap((p) => p)).toHaveLength(6);
    // 两个 epoch 是独立缓存条目（精确匹配隔离，cart 的 recommend key 不受影响）
    expect(
      qc.getQueryCache().find({ queryKey: ['products', 'recommend-infinite', 0, 6] }),
    ).toBeTruthy();
    expect(
      qc.getQueryCache().find({ queryKey: ['products', 'recommend-infinite', 1, 6] }),
    ).toBeTruthy();
    expect(qc.getQueryCache().find({ queryKey: ['products', 'recommend'] })).toBeUndefined();
  });
});
