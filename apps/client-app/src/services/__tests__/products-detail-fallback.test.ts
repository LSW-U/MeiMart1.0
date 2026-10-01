/**
 * 前端接线切换 T3（C-P1-7 收口）：getProduct 直打 /detail 聚合端点，
 * 能力开关与回退分支已删；错误原样上抛（RQ 可重试、监控不丢）。
 */
import { productApi } from '@/services/products';

const mockApiGet = jest.fn();
let mockIsMockMode = false;

jest.mock('@/services/api', () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
  get isMockMode() {
    return mockIsMockMode;
  },
}));

jest.mock('@/i18n', () => ({ getCurrentLocale: () => 'en' }));
jest.mock('@/services/mockDb', () => ({
  mockDb: { products: [] },
  mockResponse: (v: unknown) => Promise.resolve(v),
}));

const rawDetail = {
  id: 'uuid-1',
  name: { en: 'Basic Rice' },
  mainImage: 'rice.jpg',
  priceMin: 900,
  salesCount: 10,
  status: 'ACTIVE',
  unit: { en: 'kg' },
  createdAt: '2026-07-25T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
  isCategoryTop3: true,
  images: ['a.jpg'],
  skus: [],
};

describe('前端接线切换 T3：getProduct 直打 /detail', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockIsMockMode = false;
  });

  it('请求 /detail 聚合端点并透传 isCategoryTop3 + 金额分转元', async () => {
    mockApiGet.mockResolvedValueOnce({ data: rawDetail });
    const product = await productApi.getProduct('uuid-1');
    expect(mockApiGet).toHaveBeenCalledTimes(1);
    expect(mockApiGet).toHaveBeenCalledWith('/client/products/uuid-1/detail');
    expect(product?.isCategoryTop3).toBe(true);
    expect(product?.price).toBe(9); // priceMin 900 分 → 9 元
  });

  it('错误原样上抛（不再回退 /{id}、不 try 吞）', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('Network Error'));
    await expect(productApi.getProduct('uuid-1')).rejects.toThrow('Network Error');
    expect(mockApiGet).toHaveBeenCalledTimes(1);
    expect(mockApiGet).toHaveBeenCalledWith('/client/products/uuid-1/detail');
  });

  it('404 同样上抛（RQ 可重试、监控不丢）', async () => {
    const notFound = Object.assign(new Error('Request failed with status code 404'), {
      response: { status: 404 },
    });
    mockApiGet.mockRejectedValueOnce(notFound);
    await expect(productApi.getProduct('uuid-1')).rejects.toMatchObject({
      response: { status: 404 },
    });
  });
});
