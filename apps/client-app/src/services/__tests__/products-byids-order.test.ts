/**
 * getProductsByIds 保序修复（20261109 回归线）
 *
 * 原 filter-fulfilled 写法顺序跟随完成序（并发时序不定→浏览历史列表乱序）；
 * 修复后按 ids 索引对位取 fulfilled 值——即使后写先完成也保 ids 序。
 */
import { productApi } from '@/services/products';
import type { Product } from '@/types';

let mockIsMockMode = false;
// getProduct 可编程延迟/成败：验证并发完成顺序不影响输出顺序
const mockGetProduct = jest.fn() as jest.Mock<Promise<Product | undefined>, [string]>;

jest.mock('@/services/api', () => ({
  api: { get: jest.fn() },
  get isMockMode() {
    return mockIsMockMode;
  },
}));

jest.mock('@/i18n', () => ({ getCurrentLocale: () => 'en' }));

function product(id: string): Product {
  return {
    id,
    name: { en: `P${id}`, zh: `商品${id}`, tet: `P${id}`, pt: `P${id}` },
    price: 10,
    image: '',
    category: 'c001',
  } as Product;
}

describe('productApi.getProductsByIds — real 分支保序（20261109 修复）', () => {
  beforeEach(() => {
    mockIsMockMode = false;
    mockGetProduct.mockReset();
  });

  it('后发先至（乱序完成）→ 输出仍保 ids 顺序', async () => {
    // p1 延迟 30ms、p2 即回、p3 延迟 10ms → 完成序 p2,p3,p1，但输出必须是 p1,p2,p3
    mockGetProduct.mockImplementation((id: string) => {
      const delay = id === 'p1' ? 30 : id === 'p3' ? 10 : 0;
      return new Promise((resolve) => setTimeout(() => resolve(product(id)), delay));
    });
    // spyOn 模块对象方法（service 单例 this.getProduct）
    const spy = jest
      .spyOn(productApi, 'getProduct')
      .mockImplementation((id: string) => mockGetProduct(id));
    const result = await productApi.getProductsByIds(['p1', 'p2', 'p3']);
    expect(result.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
    spy.mockRestore();
  });

  it('404/失败项丢弃后剩余项仍保相对顺序', async () => {
    mockGetProduct.mockImplementation((id: string) =>
      id === 'p2' ? Promise.resolve(undefined) : Promise.resolve(product(id)),
    );
    const spy = jest
      .spyOn(productApi, 'getProduct')
      .mockImplementation((id: string) => mockGetProduct(id));
    const result = await productApi.getProductsByIds(['p1', 'p2', 'p3', 'p4']);
    expect(result.map((p) => p.id)).toEqual(['p1', 'p3', 'p4']);
    spy.mockRestore();
  });

  it('空 ids → 空数组不发请求', async () => {
    const spy = jest.spyOn(productApi, 'getProduct');
    const result = await productApi.getProductsByIds([]);
    expect(result).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
