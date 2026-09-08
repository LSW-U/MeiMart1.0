/**
 * products service 测试（批D D1/D2/D3/D5）
 *
 * - real 分支（transformProduct）：详情 raw 的 images/stock/rating/isCategoryTop3 透传 + priceMin 分转元；
 *   列表 raw 无这些字段 → undefined（徽章/多图 UI 降级隐藏）
 * - mock 分支：withMockCategoryTop3 按后端同款规则（同分类 salesCount Top3）派生；
 *   getWarehouseAvailability 按库存合成三态
 * - real 分支 warehouse-availability：门禁关闭（端点未部署）→ null 且不发请求
 */
import type { Product, WarehouseAvailability } from '@/types';
import { productApi } from '@/services/products';

const mockApiGet = jest.fn();
// Why: getter 形式 jest.mock factory —— Babel CJS 编译下 isMockMode 是命名空间属性访问（call-time 求值），可按用例翻转
let mockIsMockMode = true;

jest.mock('@/services/api', () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
  get isMockMode() {
    return mockIsMockMode;
  },
}));

// 详情接口 raw（契约：images 必填、stock?/rating?/skus）
const rawDetail = {
  id: 'uuid-1',
  shopId: 'shop-1',
  categoryId: 'cat-fruits',
  categoryName: { en: 'Fruits' },
  name: { en: 'Premium Arabica', zh: '精品咖啡' },
  description: null,
  mainImage: 'main.jpg',
  images: ['main.jpg', 'b.jpg', 'c.jpg'],
  status: 'ACTIVE',
  unit: { en: 'kg' },
  priceMin: 1850, // 分 → 元 18.5
  salesCount: 320,
  stock: 6,
  rating: 4.7,
  isCategoryTop3: true,
  createdAt: '2026-07-25T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
};

// 列表接口 raw（契约：无 images/skus/stock 之外的聚合字段）
const rawListItem = {
  id: 'uuid-2',
  name: { en: 'Local Rice', zh: '本地米' },
  mainImage: 'rice.jpg',
  priceMin: 900,
  defaultSkuId: null,
  status: 'ACTIVE',
  salesCount: 120,
};

describe('productApi — real 分支（transformProduct 透传）', () => {
  beforeEach(() => {
    mockIsMockMode = false;
    mockApiGet.mockClear();
  });

  it('详情 raw：images/stock/rating/isCategoryTop3 透传 + priceMin 分转元（批D D1/D2/D3）', async () => {
    mockApiGet.mockResolvedValueOnce({ data: rawDetail });
    const p = await productApi.getProduct('uuid-1');
    // P1-1（审查修复）：切批B /detail 聚合端点（isCategoryTop3 数据源）
    expect(mockApiGet).toHaveBeenCalledWith('/client/products/uuid-1/detail');
    expect(p).toMatchObject({
      price: 18.5,
      image: 'main.jpg',
      images: ['main.jpg', 'b.jpg', 'c.jpg'],
      stock: 6,
      rating: 4.7,
      isCategoryTop3: true,
      salesCount: 320,
    });
  });

  it('列表 raw：无 images/isCategoryTop3 → undefined（UI 降级：单图轮播 + 无徽章）', async () => {
    mockApiGet.mockResolvedValueOnce({
      data: { items: [rawListItem], total: 1, page: 1, pageSize: 20, hasMore: false },
    });
    const list = await productApi.getProducts();
    expect(list[0].images).toBeUndefined();
    expect(list[0].isCategoryTop3).toBeUndefined();
    expect(list[0].stock).toBeUndefined();
  });

  it('warehouse-availability 门禁关闭（D11 端点未部署）→ null 且不发请求', async () => {
    const r: WarehouseAvailability | null = await productApi.getWarehouseAvailability(
      'uuid-1',
      -8.5569,
      125.5603,
    );
    expect(r).toBeNull();
    expect(mockApiGet).not.toHaveBeenCalled();
  });
});

describe('productApi — mock 分支', () => {
  beforeEach(() => {
    mockIsMockMode = true;
    mockApiGet.mockClear();
  });

  it('getProduct 透传 stock/rating + 按 Top3 规则派生 isCategoryTop3（fruits 销量第一）', async () => {
    const p: Product | undefined = await productApi.getProduct('p001');
    expect(p?.stock).toBe(85);
    expect(p?.rating).toBe(4.8);
    expect(p?.isCategoryTop3).toBe(true);
  });

  it('getProducts 列表与详情徽章口径一致（isCategoryTop3 同派生）', async () => {
    const list = await productApi.getProducts();
    expect(list.find((p) => p.id === 'p001')?.isCategoryTop3).toBe(true);
  });

  it('getWarehouseAvailability mock 合成三态：有库存/0 库存仓售罄/坐标出圈无匹配仓（P2-2）', async () => {
    const ok = await productApi.getWarehouseAvailability('p001', -8.5569, 125.5603);
    expect(ok).toMatchObject({
      available: true,
      quantity: 85,
      warehouseName: 'Dili Central Warehouse',
      matchedWarehouseId: 'mock-warehouse-p001',
    });
    // 仓售罄：匹配到仓（matchedWarehouseId 非空）但 quantity=0
    const soldOut = await productApi.getWarehouseAvailability('p003', -8.5569, 125.5603);
    expect(soldOut).toMatchObject({
      available: false,
      quantity: 0,
      matchedWarehouseId: 'mock-warehouse-p003',
    });
    // 无货：坐标在帝力范围外 → 无匹配仓（matchedWarehouseId:null，模拟匹配失败）
    const noMatch = await productApi.getWarehouseAvailability('p001', 0, 0);
    expect(noMatch).toMatchObject({
      available: false,
      matchedWarehouseId: null,
      warehouseName: null,
    });
    // 商品不存在 → null（UI 隐藏）
    const none = await productApi.getWarehouseAvailability('p999', -8.5569, 125.5603);
    expect(none).toBeNull();
  });
});
