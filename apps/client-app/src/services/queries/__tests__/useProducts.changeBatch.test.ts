/**
 * 换一批按钮 批2：hook 层 offset 透传 + queryKey 断言（方案v2：offset 进 queryKey 分批缓存）
 */
import { renderHookWithClient, createTestQueryClient } from './testHarness';
import { useRecommendations, useBuyAgain } from '@/services/queries/useProducts';

const mockGetRecommendations = jest.fn().mockResolvedValue([]);
const mockGetBuyAgain = jest.fn().mockResolvedValue([]);

jest.mock('@/services/products', () => ({
  productApi: {
    getRecommendations: (...args: unknown[]) => mockGetRecommendations(...args),
    getBuyAgain: (...args: unknown[]) => mockGetBuyAgain(...args),
  },
}));

describe('useRecommendations/useBuyAgain — offset 进 queryKey + 透传', () => {
  it('useRecommendations 默认 offset=0：queryKey ["products","recommend",0]，不传 opts', async () => {
    const qc = createTestQueryClient();
    const { result } = renderHookWithClient(() => useRecommendations(), qc);
    await result.current;
    expect(mockGetRecommendations).toHaveBeenCalledWith(undefined);
    // queryKey 断言：分批缓存成立的前提
    expect(qc.getQueryCache().find({ queryKey: ['products', 'recommend', 0] })).toBeTruthy();
  });

  it('useRecommendations offset=6：queryKey 携带 offset，透传给 service', async () => {
    const qc = createTestQueryClient();
    const { result } = renderHookWithClient(() => useRecommendations({ limit: 6, offset: 6 }), qc);
    await result.current;
    expect(mockGetRecommendations).toHaveBeenCalledWith({ limit: 6, offset: 6 });
    expect(qc.getQueryCache().find({ queryKey: ['products', 'recommend', 6] })).toBeTruthy();
    // 不同 offset 是不同 query（分批隔离，不吃旧批缓存）
    expect(qc.getQueryCache().find({ queryKey: ['products', 'recommend'] })).toBeUndefined();
  });

  it('useBuyAgain offset=4：queryKey ["products","buy-again",4]', async () => {
    const qc = createTestQueryClient();
    const { result } = renderHookWithClient(() => useBuyAgain({ limit: 4, offset: 4 }), qc);
    await result.current;
    expect(mockGetBuyAgain).toHaveBeenCalledWith({ limit: 4, offset: 4 });
    expect(qc.getQueryCache().find({ queryKey: ['products', 'buy-again', 4] })).toBeTruthy();
  });
});
