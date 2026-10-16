/**
 * 换一批按钮 批2：service 层 offset 透传（方案v2 三层透传）
 *
 * - real 分支：limit/offset 进 params（后端批1 clampOffset 兜底负值/NaN）
 * - mock 分支：模块级游标切片，越界回绕 0（与视图层短批回绕语义一致）；翻页不重复
 */
import { productApi } from '@/services/products';
import type { Product } from '@/types';

const mockApiGet = jest.fn();
let mockIsMockMode = false;

jest.mock('@/services/api', () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
  get isMockMode() {
    return mockIsMockMode;
  },
}));

jest.mock('@/i18n', () => ({ getCurrentLocale: () => 'en' }));

// Why: mock 分支依赖 mockDb.products 池（withMockCategoryTop3 派生），用真实 mocks/data 池
//   （15 条）验证切片/回绕；mockResponse 直透返回值便于断言切片区间
jest.mock('@/services/mockDb', () => ({
  mockDb: { products: require('../../../mocks/data/products.json') },
  mockResponse: (v: unknown) => Promise.resolve(v),
}));

describe('productApi 换一批 — real 分支 params 透传', () => {
  beforeEach(() => {
    mockIsMockMode = false;
    mockApiGet.mockReset().mockResolvedValue({ data: [] });
  });

  it('getRecommendations 透传 limit+offset', async () => {
    await productApi.getRecommendations({ limit: 6, offset: 12 });
    expect(mockApiGet).toHaveBeenCalledWith(
      '/client/products/recommendations',
      expect.objectContaining({ params: { limit: 6, offset: 12 } }),
    );
  });

  it('getBuyAgain 透传 limit+offset', async () => {
    await productApi.getBuyAgain({ limit: 4, offset: 4 });
    expect(mockApiGet).toHaveBeenCalledWith(
      '/client/products/buy-again',
      expect.objectContaining({ params: { limit: 4, offset: 4 } }),
    );
  });

  it('不传 opts → params 为空对象（第一批行为与此前一致，回归）', async () => {
    await productApi.getRecommendations();
    expect(mockApiGet).toHaveBeenCalledWith(
      '/client/products/recommendations',
      expect.objectContaining({ params: {} }),
    );
  });
});

describe('productApi 换一批 — mock 分支游标切片 + 越界回绕', () => {
  beforeEach(() => {
    mockIsMockMode = true;
    mockApiGet.mockClear();
  });

  it('offset=0/6/12 三批互不重叠（15 条池、limit 6）', async () => {
    const b1: Product[] = await productApi.getRecommendations({ limit: 6, offset: 0 });
    const b2: Product[] = await productApi.getRecommendations({ limit: 6, offset: 6 });
    const b3: Product[] = await productApi.getRecommendations({ limit: 6, offset: 12 });
    const ids = new Set([...b1, ...b2, ...b3].map((p) => p.id));
    expect(ids.size).toBe(b1.length + b2.length + b3.length);
    expect(b3.length).toBeLessThan(6); // 末批短批 → 视图层回绕信号
  });

  it('offset 越界（≥池长）回绕 0（与视图层短批回绕语义一致）', async () => {
    const wrapped: Product[] = await productApi.getRecommendations({ limit: 6, offset: 18 });
    const first: Product[] = await productApi.getRecommendations({ limit: 6, offset: 0 });
    expect(wrapped.map((p) => p.id)).toEqual(first.map((p) => p.id));
  });

  it('getBuyAgain mock 同款切片：offset=0 与 offset=4 不重叠', async () => {
    const b1: Product[] = await productApi.getBuyAgain({ limit: 4, offset: 0 });
    const b2: Product[] = await productApi.getBuyAgain({ limit: 4, offset: 4 });
    const ids1 = new Set(b1.map((p) => p.id));
    expect(b2.some((p) => ids1.has(p.id))).toBe(false);
  });
});
