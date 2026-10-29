/**
 * useOffsetInfinite 单测（数据层工程治理 批2 V2-1，方案v2 20261029）
 *
 * 验证（对齐任务书四能力）：
 *   - offset 分页：pageParam 0/limit/2*limit 递进，fetchPage 收批内相对 offset
 *   - 满页短批终止：满页（length === limit）才有下一页；短批/空批 → hasNextPage=false
 *   - 防连点：isFetchingNextPage 期间 guardedFetchNextPage 忽略重复调用
 *   - keepPreviousData 可配：默认 false（换 key 露 loading），true 时保旧列表占位
 */
import {
  renderHookWithClient,
  createTestQueryClient,
} from '@/services/queries/__tests__/testHarness';
import { act, waitFor } from '@testing-library/react-native';
import { useOffsetInfinite } from '../useOffsetInfinite';

const makePage = (offset: number, size: number, limit: number) =>
  Array.from({ length: size }, (_, i) => `p${offset + i + 1}`).slice(0, limit);

describe('useOffsetInfinite — offset 分页 + 满页短批终止', () => {
  it('offset 分页：首屏 pageParam=0，fetchNextPage 推进 0→limit→2*limit，pages 追加不替换', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(makePage(0, 6, 6))
      .mockResolvedValueOnce(makePage(6, 6, 6))
      .mockResolvedValueOnce(makePage(12, 6, 6));

    const qc = createTestQueryClient();
    const { result } = renderHookWithClient(
      () => useOffsetInfinite<string>({ queryKey: ['test', 'offset-inf'], fetchPage, limit: 6 }),
      qc,
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchPage).toHaveBeenLastCalledWith(0);
    expect(result.current.data?.pages).toHaveLength(1);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith(6));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith(12));
    // pages 追加：三页拼 18 条
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(3));
    expect(result.current.data?.pages.flatMap((p) => p)).toHaveLength(18);
  });

  it('满页短批终止：短批（< limit）→ hasNextPage=false，到底后再 fetchNextPage 不再发请求', async () => {
    // mock 池 15 条口径：6 + 6 + 3
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(makePage(0, 6, 6))
      .mockResolvedValueOnce(makePage(6, 6, 6))
      .mockResolvedValueOnce(makePage(12, 3, 6));
    const qc = createTestQueryClient();
    const { result } = renderHookWithClient(
      () => useOffsetInfinite<string>({ queryKey: ['test', 'short-batch'], fetchPage, limit: 6 }),
      qc,
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(3));
    // 短批 3 条 → 终止
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.data?.pages.flatMap((p) => p)).toHaveLength(15);

    // 到底后不再发请求
    const calls = fetchPage.mock.calls.length;
    await act(async () => {
      await result.current.fetchNextPage();
    });
    expect(fetchPage.mock.calls.length).toBe(calls);
  });

  it('空批终止：返回 [] 时 hasNextPage=false', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(makePage(0, 6, 6))
      .mockResolvedValueOnce([]);
    const qc = createTestQueryClient();
    const { result } = renderHookWithClient(
      () => useOffsetInfinite<string>({ queryKey: ['test', 'empty-batch'], fetchPage, limit: 6 }),
      qc,
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
  });

  it('防连点：isFetchingNextPage 期间 guardedFetchNextPage 忽略重复调用', async () => {
    let resolveSecond!: (v: string[]) => void;
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(makePage(0, 6, 6))
      // 第二页挂起：模拟慢请求窗口
      .mockReturnValueOnce(new Promise<string[]>((res) => (resolveSecond = res)));
    const qc = createTestQueryClient();
    const { result } = renderHookWithClient(
      () => useOffsetInfinite<string>({ queryKey: ['test', 'guard'], fetchPage, limit: 6 }),
      qc,
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(async () => {
      result.current.fetchNextPage();
      result.current.fetchNextPage(); // 追加中连点 → 被守卫吞掉
      result.current.fetchNextPage();
    });
    resolveSecond(makePage(6, 6, 6));
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    // 只有第 2 页这 1 次真实请求（连点未放大）
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('换 key（cycle/baseOffset 由调用方折进 queryKey）：换 key 露 loading，独立缓存', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(makePage(0, 6, 6))
      .mockResolvedValueOnce(makePage(6, 6, 6));
    const qc = createTestQueryClient();
    const { result, rerender } = renderHookWithClient(
      (p: { cycle: number }) =>
        useOffsetInfinite<string>({
          queryKey: ['test', 'cycle-key', p.cycle],
          fetchPage,
          limit: 6,
        }),
      qc,
      { cycle: 0 },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // cycle++ 换 key：placeholderData 默认 undefined → 旧 key 数据不透传，露 loading
    rerender({ cycle: 1 });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // 两个 cycle 是独立缓存条目
    expect(qc.getQueryCache().find({ queryKey: ['test', 'cycle-key', 0] })).toBeTruthy();
    expect(qc.getQueryCache().find({ queryKey: ['test', 'cycle-key', 1] })).toBeTruthy();
  });

  it('keepPreviousData: true → 换 key 保旧列表占位（不露 loading）', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(makePage(0, 6, 6))
      .mockResolvedValueOnce(makePage(6, 6, 6));
    const qc = createTestQueryClient();
    const { result, rerender } = renderHookWithClient(
      (p: { cycle: number }) =>
        useOffsetInfinite<string>({
          queryKey: ['test', 'keep-prev', p.cycle],
          fetchPage,
          limit: 6,
          keepPreviousData: true,
        }),
      qc,
      { cycle: 0 },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ cycle: 1 });
    // 占位生效：旧 key 数据仍在渲染（isPlaceholderData 标记），非 undefined
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data?.pages.flatMap((p) => p)).toHaveLength(6);
  });

  it('enabled=false 不发请求', () => {
    const fetchPage = jest.fn();
    const qc = createTestQueryClient();
    const { result } = renderHookWithClient(
      () =>
        useOffsetInfinite<string>({
          queryKey: ['test', 'disabled'],
          fetchPage,
          limit: 6,
          enabled: false,
        }),
      qc,
    );
    expect(result.current.data).toBeUndefined();
    expect(fetchPage).not.toHaveBeenCalled();
  });
});
