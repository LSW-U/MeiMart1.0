/**
 * C-P1-7: getProduct /detail 能力开关 + 404/网络失败回退 /{id}
 *
 * 两态（开关开/关）+ 失败回退；回退响应无 isCategoryTop3 → Product.isCategoryTop3 为
 * undefined（optional，徽章降级隐藏），不崩。
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

// getter 式翻转 extra（USE_PRODUCT_DETAIL 开关）
let mockExtra: Record<string, string | undefined> = {};
jest.mock('@/config/app-config', () => ({
  getExtra: () => mockExtra,
}));

jest.mock('@/i18n', () => ({ getCurrentLocale: () => 'en' }));
jest.mock('@/services/mockDb', () => ({
  mockDb: { products: [] },
  mockResponse: (v: unknown) => Promise.resolve(v),
}));

// 普通 /{id} 响应（无 isCategoryTop3）
const rawBasic = {
  id: 'uuid-1',
  name: { en: 'Basic Rice' },
  mainImage: 'rice.jpg',
  priceMin: 900,
  salesCount: 10,
  status: 'ACTIVE',
  unit: { en: 'kg' },
  createdAt: '2026-07-25T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
};

const rawDetail = { ...rawBasic, isCategoryTop3: true, images: ['a.jpg'], skus: [] };

const notFoundError = Object.assign(new Error('Request failed with status code 404'), {
  response: { status: 404 },
});

describe('C-P1-7 getProduct /detail 能力开关降级', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockIsMockMode = false;
    mockExtra = {};
  });

  it('开关开（默认）：请求 /detail 聚合端点并透传 isCategoryTop3', async () => {
    mockApiGet.mockResolvedValueOnce({ data: rawDetail });
    const product = await productApi.getProduct('uuid-1');
    expect(mockApiGet).toHaveBeenCalledWith('/client/products/uuid-1/detail');
    expect(product?.isCategoryTop3).toBe(true);
  });

  it('开关关（EXPO_PUBLIC_USE_PRODUCT_DETAIL=false）：直接请求普通 /{id}，不发 /detail', async () => {
    mockExtra = { USE_PRODUCT_DETAIL: 'false' };
    // 重新加载模块使常量按新 extra 求值（jest.resetModules + requireActual，jest 环境无 ESM dynamic import）
    jest.resetModules();
    const { productApi: freshApi } =
      require('@/services/products') as typeof import('@/services/products');
    mockApiGet.mockResolvedValueOnce({ data: rawBasic });
    const product = await freshApi.getProduct('uuid-1');
    expect(mockApiGet).toHaveBeenCalledTimes(1);
    expect(mockApiGet).toHaveBeenCalledWith('/client/products/uuid-1');
    // 回退响应无 isCategoryTop3 → optional 字段为 undefined（不崩，徽章降级隐藏）
    expect(product?.isCategoryTop3).toBeUndefined();
  });

  it('/detail 404（批B 未部署）→ 自动回退普通 /{id}，详情不白屏', async () => {
    mockApiGet.mockRejectedValueOnce(notFoundError).mockResolvedValueOnce({ data: rawBasic });
    const product = await productApi.getProduct('uuid-1');
    expect(mockApiGet).toHaveBeenCalledTimes(2);
    expect(mockApiGet).toHaveBeenNthCalledWith(1, '/client/products/uuid-1/detail');
    expect(mockApiGet).toHaveBeenNthCalledWith(2, '/client/products/uuid-1');
    expect(product?.id).toBe('uuid-1');
    expect(product?.isCategoryTop3).toBeUndefined();
  });

  it('/detail 网络错误 → 同样回退 /{id}', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce({
      data: rawBasic,
    });
    const product = await productApi.getProduct('uuid-1');
    expect(mockApiGet).toHaveBeenCalledTimes(2);
    expect(product?.price).toBe(9); // priceMin 900 分 → 9 元
  });
});
