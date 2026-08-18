import { act } from '@testing-library/react-native';
import type { Product } from '@/types';
import { favoritesApi } from '@/services/favorites';
import { FAVORITES_QUERY_KEY, useRemoveFavorites } from '../useFavorites';
import { createTestQueryClient, renderHookWithClient } from './testHarness';

jest.mock('@/services/favorites');

const mkProduct = (id: string): Product => ({
  id,
  name: { zh: `商品${id}`, en: `Product ${id}`, tet: `Product ${id}` },
  price: 5,
  image: '',
  category: 'x',
});

const baseFavorites = ['p1', 'p2', 'p3'].map(mkProduct);

function setup() {
  const qc = createTestQueryClient();
  qc.setQueryData(FAVORITES_QUERY_KEY, baseFavorites);
  return qc;
}

describe('useRemoveFavorites（P19 审查 Q2：allSettled 局部回滚）', () => {
  beforeEach(() => jest.clearAllMocks());

  it('全部成功：乐观移除全部，cache 只剩未选', async () => {
    (favoritesApi.toggle as jest.Mock).mockResolvedValue({ isFavorite: false });
    const qc = setup();

    const { result } = renderHookWithClient(() => useRemoveFavorites(), qc);
    await act(async () => {
      const res = await result.current.mutateAsync(['p1', 'p3']);
      expect(res).toEqual({ failedIds: [], okCount: 2 });
    });

    const list = qc.getQueryData<Product[]>(FAVORITES_QUERY_KEY);
    expect(list?.map((p) => p.id)).toEqual(['p2']);
  });

  it('部分失败：失败项加回 cache（成功项保持移除，无幽灵项）', async () => {
    // p1 成功、p2 失败、p3 成功 → cache 只剩 p2（失败的恢复）
    (favoritesApi.toggle as jest.Mock).mockImplementation(async (id: string) => {
      if (id === 'p2') throw new Error('network');
      return { isFavorite: false };
    });
    const qc = setup();

    const { result } = renderHookWithClient(() => useRemoveFavorites(), qc);
    await act(async () => {
      const res = await result.current.mutateAsync(['p1', 'p2', 'p3']);
      expect(res.failedIds).toEqual(['p2']);
      expect(res.okCount).toBe(2);
    });

    // 关键断言：成功的 p1/p3 保持移除（整体回滚 bug 会让它们变幽灵项），仅失败的 p2 恢复
    const list = qc.getQueryData<Product[]>(FAVORITES_QUERY_KEY);
    expect(list?.map((p) => p.id).sort()).toEqual(['p2']);
  });

  it('全部失败：所有失败项恢复', async () => {
    (favoritesApi.toggle as jest.Mock).mockRejectedValue(new Error('offline'));
    const qc = setup();

    const { result } = renderHookWithClient(() => useRemoveFavorites(), qc);
    await act(async () => {
      const res = await result.current.mutateAsync(['p1']);
      expect(res).toEqual({ failedIds: ['p1'], okCount: 0 });
    });

    // p1 加回（在末尾，顺序不保证），p2/p3 未动
    const list = qc.getQueryData<Product[]>(FAVORITES_QUERY_KEY);
    expect(list?.map((p) => p.id).sort()).toEqual(['p1', 'p2', 'p3']);
  });
});
