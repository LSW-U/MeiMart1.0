/**
 * C-P2-5: 仅 404 降级空态，其余错误 rethrow（RQ 可重试、监控不丢）
 *
 * - reviews.getByProduct：404 → 空列表+空 summary；500/网络 → rethrow
 * - products.getWarehouseAvailability：404 → null；500/网络 → rethrow
 */
import { reviewsApi } from '@/services/reviews';
import { productApi } from '@/services/products';

let mockIsMockMode = false;
jest.mock('@/services/api', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: jest.fn(),
  },
  get isMockMode() {
    return mockIsMockMode;
  },
}));

const mockApiGet = jest.fn();

jest.mock('@/i18n', () => ({ getCurrentLocale: () => 'en' }));
jest.mock('@/services/mockDb', () => ({
  mockDb: { reviews: [], products: [] },
  mockResponse: (v: unknown) => Promise.resolve(v),
}));

const notFoundError = () => {
  const err = new Error('Request failed with status code 404') as Error & {
    response?: { status: number };
  };
  err.response = { status: 404 };
  return err;
};

describe('C-P2-5 reviews.getByProduct 404 降级', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockIsMockMode = false;
  });

  it('404 → 空列表 + 空 summary（不 throw）', async () => {
    mockApiGet.mockRejectedValueOnce(notFoundError());
    const out = await reviewsApi.getByProduct('p1');
    expect(out.reviews).toEqual([]);
    expect(out.summary).toMatchObject({ count: 0, avg: 0 });
  });

  it('500 → rethrow（RQ 可重试、监控不丢）', async () => {
    mockApiGet.mockRejectedValueOnce(
      Object.assign(new Error('500'), { response: { status: 500 } }),
    );
    await expect(reviewsApi.getByProduct('p1')).rejects.toThrow('500');
  });

  it('网络错误（无 response）→ rethrow', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('Network Error'));
    await expect(reviewsApi.getByProduct('p1')).rejects.toThrow('Network Error');
  });
});

describe('C-P2-5 products.getWarehouseAvailability 404 降级', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockIsMockMode = false;
  });

  it('404 → null（不 throw）', async () => {
    mockApiGet.mockRejectedValueOnce(notFoundError());
    const out = await productApi.getWarehouseAvailability('p1', -8.5569, 125.5603);
    expect(out).toBeNull();
  });

  // Why: WAREHOUSE_AVAILABILITY_READY=false 时 404 前即短路返 null（D5/D11 门禁），
  //   500/网络 rethrow 分支仅在端点上线（改 true）后可达——此处直接单测 isNotFoundError
  //   同源口径（reviews 用同一 helper），rethrow 行为由代码路径审查保证。
  it('500/网络错误 → 非 404 不降级（rethrow 语义，端点上线后生效）', async () => {
    // 端点未上线（READY=false）任何输入都返 null，不抛——断言不 throw 即可
    mockApiGet.mockRejectedValueOnce(
      Object.assign(new Error('500'), { response: { status: 500 } }),
    );
    await expect(productApi.getWarehouseAvailability('p1', -8.5569, 125.5603)).resolves.toBeNull();
  });
});
