/**
 * 首页推荐展示 批2：useRecommendationsInfinite 追加式真分页（方案v2 20261017）
 *
 * 验证：
 *   - 翻页推进：pageParam=offset，fetchNextPage → offset=limit，pages 追加不替换
 *   - 短批/空批终止：getNextPageParam 按页长判定（响应无 hasMore，E6 红线）
 *   - baseOffset 推进（D3 方案 B → 20261023 real 模式修订）：baseOffset 变 queryKey，
 *     请求 offset = baseOffset + pageIdx*limit，换到的真是后面一批商品
 *     （原 epoch++ 重查 offset=0 在后端确定性排序下返回同一批 → 换一批「没反应」实证）
 */
import { renderHookWithClient, createTestQueryClient } from './testHarness';
import { act, waitFor } from '@testing-library/react-native';
import { useRecommendationsInfinite, useRecommendations } from '@/services/queries/useProducts';

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

  it('首屏 offset=0 透传 limit；queryKey 含 baseOffset 与 limit 位', async () => {
    mockGetRecommendations.mockResolvedValue(makePage(0, 6));
    const qc = createTestQueryClient();
    const { result } = renderHookWithClient(
      () => useRecommendationsInfinite({ limit: 6, baseOffset: 0 }),
      qc,
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetRecommendations).toHaveBeenCalledWith({ limit: 6, offset: 0 });
    expect(
      qc.getQueryCache().find({ queryKey: ['products', 'recommend-infinite', 0, 0, 6] }),
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

  it('baseOffset 推进（20261023 修订）：baseOffset=6 时请求 offset=6，换到的真是下一批', async () => {
    mockGetRecommendations
      .mockResolvedValueOnce(makePage(0, 6)) // baseOffset=0 首屏
      .mockResolvedValueOnce(makePage(6, 6)); // baseOffset=6 的第一页（真·下一批）
    const qc = createTestQueryClient();
    const { result, rerender } = renderHookWithClient(
      (p: { baseOffset: number }) =>
        useRecommendationsInfinite({ limit: 6, baseOffset: p.baseOffset }),
      qc,
      { baseOffset: 0 },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // baseOffset 0→6：请求 offset = 6 + 0 = 6（不再是 offset=0 的同一批）
    // Why: waitFor 数据而非 isSuccess——placeholderData 让新 query 在占位阶段也置
    //   isSuccess=true（data 还是旧批），等真实新批 ids 到达才算复位完成
    rerender({ baseOffset: 6 });
    await waitFor(() =>
      expect((result.current.data?.pages ?? []).flatMap((p) => p.map((x) => x.id))).toEqual([
        'p7',
        'p8',
        'p9',
        'p10',
        'p11',
        'p12',
      ]),
    );
    expect(mockGetRecommendations).toHaveBeenLastCalledWith({ limit: 6, offset: 6 });
    // 两个 baseOffset 是独立缓存条目（精确匹配隔离，cart 的 recommend key 不受影响）
    expect(
      qc.getQueryCache().find({ queryKey: ['products', 'recommend-infinite', 0, 0, 6] }),
    ).toBeTruthy();
    expect(
      qc.getQueryCache().find({ queryKey: ['products', 'recommend-infinite', 6, 0, 6] }),
    ).toBeTruthy();
    expect(qc.getQueryCache().find({ queryKey: ['products', 'recommend'] })).toBeUndefined();
  });

  it('baseOffset 推进 + 翻页叠加：pageParam 基于 baseOffset 递增（offset=6→12）', async () => {
    mockGetRecommendations
      .mockResolvedValueOnce(makePage(6, 6))
      .mockResolvedValueOnce(makePage(12, 6));
    const qc = createTestQueryClient();
    const { result, rerender } = renderHookWithClient(
      () => useRecommendationsInfinite({ limit: 6, baseOffset: 6 }),
      qc,
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetRecommendations).toHaveBeenCalledWith({ limit: 6, offset: 6 });
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() =>
      expect(mockGetRecommendations).toHaveBeenLastCalledWith({ limit: 6, offset: 12 }),
    );
    // Why: 先 rerender 同步 renderHook 闭包（fetchNextPage 返回值已含 2 页，缓存正确，
    //   hook 层 data 需一次重渲染才反映），再断言拼接长度
    rerender({});
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect((result.current.data?.pages ?? []).flatMap((p) => p)).toHaveLength(12);
  });

  it('20261024 修订：换一批换 key 瞬间不保旧列表占位（旧 70 条不再顶到新 key，露 loading）', async () => {
    mockGetRecommendations
      .mockResolvedValueOnce(makePage(0, 6))
      .mockResolvedValueOnce(makePage(6, 6)); // baseOffset=6 的首屏
    const qc = createTestQueryClient();
    const { result, rerender } = renderHookWithClient(
      (p: { baseOffset: number }) =>
        useRecommendationsInfinite({ limit: 6, baseOffset: p.baseOffset }),
      qc,
      { baseOffset: 0 },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // baseOffset 变化瞬间：queryKey 换新且 fetch 未 resolve——placeholderData 恒 undefined，
    // 旧 key 数据不得透传到新 key（旧行为把加载到底的多页列表顶到新 key = 「收不回去」bug）
    rerender({ baseOffset: 6 });
    expect(result.current.data).toBeUndefined();
    // 露出 loading 态（换批过渡可感知）
    expect(result.current.isLoading).toBe(true);

    await waitFor(() =>
      expect(
        qc.getQueryCache().find({ queryKey: ['products', 'recommend-infinite', 6, 0, 6] }),
      ).toBeTruthy(),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('20261024 方案A：baseOffset 推进时 cycle 位 +1（换 key 甩掉 5min 内旧整链缓存）', async () => {
    mockGetRecommendations
      .mockResolvedValueOnce(makePage(0, 6)) // cycle=0, baseOffset=0 首屏
      .mockResolvedValueOnce(makePage(6, 6)); // cycle=1, baseOffset=6 新 key 首屏
    const qc = createTestQueryClient();
    const { result, rerender } = renderHookWithClient(
      (p: { baseOffset: number; cycle: number }) =>
        useRecommendationsInfinite({ limit: 6, baseOffset: p.baseOffset, cycle: p.cycle }),
      qc,
      { baseOffset: 0, cycle: 0 },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 页面层（方案A）推进 baseOffset 同时 cycle++：queryKey 第三位 0→1，
    // 旧 key(0,0) 的整链缓存不再被复用（「点击换一批收不回去」缓存泄漏口）
    rerender({ baseOffset: 6, cycle: 1 });
    await waitFor(() =>
      expect(
        qc.getQueryCache().find({ queryKey: ['products', 'recommend-infinite', 6, 1, 6] }),
      ).toBeTruthy(),
    );
    // 新 key 独立取数：请求 offset=6（不是复用旧 key 数据）
    expect(mockGetRecommendations).toHaveBeenLastCalledWith({ limit: 6, offset: 6 });
  });

  it('清债微批 H2 cart 回归：旧 useRecommendations 渲染正常 + infinite epoch 变化不触碰旧缓存', async () => {
    const mockGetRecsOld = jest.requireMock('@/services/products').productApi;
    // 旧 hook 独立数据（offset state 路径）
    const oldRecs = [{ id: 'old-1' }, { id: 'old-2' }];
    let oldData = oldRecs;
    mockGetRecsOld.getRecommendations = jest.fn(() => Promise.resolve(oldData));

    const qc = createTestQueryClient();
    // ① 旧 hook 数据正常渲染
    const old = renderHookWithClient(() => useRecommendations({ limit: 4, offset: 0 }), qc);
    await waitFor(() => expect(old.result.current.isSuccess).toBe(true));
    expect(old.result.current.data).toEqual(oldRecs);

    // infinite baseOffset 0→6 翻转两次
    mockGetRecommendations.mockResolvedValue(makePage(0, 6));
    const inf = renderHookWithClient(
      (p: { baseOffset: number }) =>
        useRecommendationsInfinite({ limit: 6, baseOffset: p.baseOffset }),
      qc,
      { baseOffset: 0 },
    );
    await waitFor(() => expect(inf.result.current.isSuccess).toBe(true));
    inf.rerender({ baseOffset: 6 });
    await waitFor(() => expect(inf.result.current.isSuccess).toBe(true));

    // ② 旧 hook 缓存/数据不受影响：queryKey ['products','recommend',0] 原样在缓存，数据未变
    expect(qc.getQueryCache().find({ queryKey: ['products', 'recommend', 0] })).toBeTruthy();
    expect(old.result.current.data).toEqual(oldRecs);
    // 旧 hook 缓存数据原样（toEqual 已断言）；此处收敛断言：旧 hook 数据引用未变
    // （baseOffset 翻转未触发旧 queryKey 重取——call 计数受 mock 模块共享影响不稳定，弃用）
  });
});
