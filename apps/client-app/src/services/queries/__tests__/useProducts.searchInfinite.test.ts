/**
 * 前端接线批 批1 D3：useProductSearch 迁 useOffsetInfinite（方案v1 20261030）
 *
 * 验证（B1.2 行为等价红线）：
 *   - offset 推进：pageParam 即 offset，fetchNextPage → 0→20→40（后端 bb1820d 契约）
 *   - 满页短批终止：items.length === limit 才有下一页；短批（mock 全量 15 < 20）→ hasNextPage=false
 *   - 首屏行为等价：页形状保持 {items,hasMore,total}（消费方 pages.flatMap(p=>p.items) /
 *     pages[0].total 零改动）；首屏同 sortBy 请求参数与返回内容与迁移前一致
 *   - enabled：keyword 空白不请求（迁移前语义保留）
 */
import { renderHookWithClient, createTestQueryClient } from './testHarness';
import { act, waitFor } from '@testing-library/react-native';
import { useProductSearch } from '@/services/queries/useProducts';

const mockSearch = jest.fn();

jest.mock('@/services/products', () => ({
  productApi: {
    search: (...args: unknown[]) => mockSearch(...args),
  },
}));

type SearchPage = { items: { id: string }[]; hasMore: boolean; total: number };

const makePage = (offset: number, size: number, total: number): SearchPage => ({
  items: Array.from({ length: size }, (_, i) => ({ id: `p${offset + i + 1}` })),
  hasMore: offset + size < total,
  total,
});

describe('useProductSearch — offset 分页（前端接线批 批1 D3）', () => {
  beforeEach(() => {
    mockSearch.mockReset();
  });

  it('首屏 offset=0：请求带 offset=0/limit=20/sortBy，页形状 {items,hasMore,total} 不变', async () => {
    mockSearch.mockResolvedValue(makePage(0, 20, 45));
    const qc = createTestQueryClient();
    const { result } = renderHookWithClient(() => useProductSearch('rice', 'bestSelling'), qc);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // 行为等价红线：请求参数 offset 口径（后端双口径契约），sortBy 透传
    expect(mockSearch).toHaveBeenCalledWith('rice', {
      offset: 0,
      limit: 20,
      sortBy: 'bestSelling',
    });
    // 页形状与迁移前 useInfiniteQuery 时代一致（消费方 pages[0].total / p.items 零改动）
    const page = result.current.data?.pages[0] as SearchPage;
    expect(page.items).toHaveLength(20);
    expect(page.total).toBe(45);
    expect(page.hasMore).toBe(true);
  });

  it('offset 推进：fetchNextPage → offset 0→20→40，pages 追加不替换', async () => {
    mockSearch
      .mockResolvedValueOnce(makePage(0, 20, 45))
      .mockResolvedValueOnce(makePage(20, 20, 45))
      .mockResolvedValueOnce(makePage(40, 5, 45));
    const qc = createTestQueryClient();
    const { result } = renderHookWithClient(() => useProductSearch('rice'), qc);
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(1));
    expect(result.current.hasNextPage).toBe(true);
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(mockSearch).toHaveBeenLastCalledWith('rice', { offset: 20, limit: 20, sortBy: 'all' });
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(3));
    expect(mockSearch).toHaveBeenLastCalledWith('rice', { offset: 40, limit: 20, sortBy: 'all' });
    expect((result.current.data?.pages ?? []).flatMap((p) => p.items)).toHaveLength(45);
  });

  it('短批终止：末页 items.length < limit 时 hasNextPage=false，且不再发请求', async () => {
    mockSearch
      .mockResolvedValueOnce(makePage(0, 20, 45))
      .mockResolvedValueOnce(makePage(20, 20, 45))
      .mockResolvedValueOnce(makePage(40, 5, 45));
    const qc = createTestQueryClient();
    const { result } = renderHookWithClient(() => useProductSearch('rice'), qc);
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(1));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(3));
    expect(result.current.hasNextPage).toBe(false);
    const calls = mockSearch.mock.calls.length;
    await result.current.fetchNextPage();
    expect(mockSearch.mock.calls.length).toBe(calls);
  });

  it('首屏即短批（mock 模式等价：一次性返全部 15 < 20）→ hasNextPage=false 不触发第二页', async () => {
    // 行为等价：迁移前 mock hasMore=false 不触发第二页（P8 §5.5），迁移后页长判定同收尾
    mockSearch.mockResolvedValue(makePage(0, 15, 15));
    const qc = createTestQueryClient();
    const { result } = renderHookWithClient(() => useProductSearch('rice'), qc);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
    expect(mockSearch).toHaveBeenCalledTimes(1);
  });

  it('满页恰好到底（40 恰两满页：末页满页但 total 已尽）', async () => {
    // 边界：结果恰为 2 满页（40 条），末页 items.length === limit → 满页判定会多探一页，
    // 探页 offset=40 返回 [] 短批 → 终止（方案 §六 已知语义，后端 offset 超量返 items=[]）
    mockSearch
      .mockResolvedValueOnce(makePage(0, 20, 40))
      .mockResolvedValueOnce(makePage(20, 20, 40))
      .mockResolvedValueOnce(makePage(40, 0, 40));
    const qc = createTestQueryClient();
    const { result } = renderHookWithClient(() => useProductSearch('rice'), qc);
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(1));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(result.current.hasNextPage).toBe(true);
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(3));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('enabled：keyword 空白不请求（迁移前语义保留）', () => {
    const qc = createTestQueryClient();
    renderHookWithClient(() => useProductSearch('   '), qc);
    expect(mockSearch).not.toHaveBeenCalled();
  });
});
