import { api, isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import { getCurrentLocale } from '@/i18n';
import type { Product, WarehouseAvailability } from '@/types';

// Why: 后端 Product 字段名/单位与前端类型有差异，service 层做转换避免改组件代码。
// 后端金额单位是「分」（整数），前端 Product.price 用「元」，转换时 /100。
interface SkuRaw {
  id: string;
  productId: string;
  name: Record<string, string>;
  price: number;
  status: string;
}
interface ProductRaw {
  id: string;
  shopId: string;
  categoryId: string | null;
  categoryName: Record<string, string> | null;
  name: Record<string, string>;
  description: Record<string, string> | null;
  mainImage: string;
  // Why: 批D D1 多图轮播 — 详情接口返回 images[]，列表接口不返回（可选）
  images?: string[];
  status: string;
  unit: Record<string, string>;
  priceMin: number;
  salesCount: number;
  // Why: §7 库存 / §9-5 评分 — 契约 stock?/rating? 两接口均带，此前透传丢失致 real 模式恒 unknown，批D D2 补透传
  stock?: number;
  rating?: number;
  // Why: 批D D3 模式 A — 批B 聚合接口直出（MeiMart 仓已实现未提交，契约同步后 raw 自然携带，本层零改动）
  isCategoryTop3?: boolean;
  createdAt: string;
  updatedAt: string;
  // Why: 详情接口额外返回 skus，列表接口不返回
  skus?: SkuRaw[];
}

interface ProductListResponse {
  items: ProductRaw[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

// Why: mock 数据 price 已是元，real 数据 priceMin 是分，转换函数只在 real 分支调用，避免双倍转换
// 兜底：字段缺失时用默认值，防 NaN/undefined 渲染崩溃
function transformProduct(raw: ProductRaw): Product {
  // Why: 提取第一个 ACTIVE SKU 作为默认加购 SKU，加购 API 需要 skuId
  const activeSku = raw.skus?.find((s) => s.status === 'ACTIVE') ?? raw.skus?.[0];
  return {
    id: raw.id ?? '',
    // 后端 name 是 Record<string,string>，前端 LocalizableText 结构等价（含部分 locale key 缺失时由组件 fallback）
    name: (raw.name ?? {}) as Product['name'],
    price: (raw.priceMin ?? 0) / 100,
    image: raw.mainImage ?? '',
    images: raw.images?.filter(Boolean),
    category: raw.categoryId ?? '',
    categoryName: (raw.categoryName ?? null) as Product['categoryName'],
    salesCount: raw.salesCount ?? 0,
    // Why: 批D D2 — stock/rating 此前透传丢失（real 模式恒 unknown/无评分），补透传
    stock: raw.stock,
    rating: raw.rating,
    // P2-1（批D 审查修复）：后端为列表端点（/client/products、收藏、搜索等）补 isCategoryTop3 后，
    //   列表徽章 real 经此处透传自动恢复（resolveBadges 已消费该字段）
    isCategoryTop3: raw.isCategoryTop3,
    description: (raw.description ?? undefined) as Product['description'],
    defaultSkuId: activeSku?.id,
  };
}

// Why: 批D D3 — isCategoryTop3 后端直出（模式 A），mock 分支按同一后端规则派生
//   （同分类 salesCount Top3，对齐 MeiMart catalog.service isCategoryTop3），保证徽章
//   演示/验收可用。mock 各分类商品 ≤3 个 → 均为 Top3（真实有/无对比依赖批B 契约同步）。
//   real 契约同步后由 transformProduct 直接透传 raw.isCategoryTop3，本函数即可删。
function withMockCategoryTop3(products: Product[]): Product[] {
  const top3Ids = new Set<string>();
  const byCategory = new Map<string, Product[]>();
  for (const p of products) {
    const list = byCategory.get(p.category) ?? [];
    list.push(p);
    byCategory.set(p.category, list);
  }
  for (const list of byCategory.values()) {
    [...list]
      .sort((a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0))
      .slice(0, 3)
      .forEach((p) => top3Ids.add(p.id));
  }
  return products.map((p) => ({ ...p, isCategoryTop3: top3Ids.has(p.id) }));
}

// Why: 批D D5/D11 — 就近仓可用性端点（MeiMart 仓批B/D11）未部署到 dev。real 分支挂此门禁
//   直接返 null（UI 整块隐藏，不发请求、零 404 噪音）；端点上线后改 true 即接通，类型按
//   方案契约（WarehouseAvailability）已就位。mock 分支按 product.stock 合成供演示/验收。
const WAREHOUSE_AVAILABILITY_READY = false;

interface ProductListQuery {
  categoryId?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export const productApi = {
  async getProducts(query?: ProductListQuery): Promise<Product[]> {
    if (isMockMode) {
      // Why: P9 - mock 按销量降序，对齐 real 后端默认（salesCount desc），让 "Local Bestsellers" 名副其实
      //   顺带让推荐类页面（search/categories/cart/[id] 的 realProducts）也按热度，更合理
      const sorted = [...mockDb.products].sort((a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0));
      return mockResponse(withMockCategoryTop3(sorted));
    }
    const res = await api.get<ProductListResponse>('/client/products', { params: query });
    return res.data.items.map(transformProduct);
  },

  async getProduct(id: string): Promise<Product | undefined> {
    if (isMockMode) {
      // Why: 先派生 Top3 再查找，保证详情页热销徽章与列表口径一致（批D D3）
      const found = withMockCategoryTop3(mockDb.products).find((p) => p.id === id);
      return mockResponse(found);
    }
    // P1-1（批D 审查修复）：切批B /detail 聚合端点 —— 普通 /{id} 详情响应无 isCategoryTop3，
    //   ProductDetail（超集：stocks/totalStock/ratingCount/isCategoryTop3/skus）required 含 isCategoryTop3。
    //   real 徽章数据等 MeiMart 仓批B 部署后自动通；⚠️ 部署前 real 详情会 404，需与批B 排期对齐。
    const res = await api.get<ProductRaw & { skus: unknown[] }>(`/client/products/${id}/detail`);
    // Why: /detail 聚合端点额外返回 skus，前端 Product 类型暂未消费，忽略以保持兼容
    return transformProduct(res.data);
  },

  async getRecommendations(limit?: number): Promise<Product[]> {
    if (isMockMode) return mockResponse(withMockCategoryTop3(mockDb.products).slice(0, 6));
    const res = await api.get<ProductRaw[]>('/client/products/recommendations', {
      params: limit ? { limit } : undefined,
    });
    return res.data.map(transformProduct);
  },

  async getBuyAgain(limit?: number): Promise<Product[]> {
    if (isMockMode) return mockResponse(withMockCategoryTop3(mockDb.products).slice(6, 10));
    // Why: buy-again 是后端专属端点，不是前端按 tag 过滤
    const res = await api.get<ProductRaw[]>('/client/products/buy-again', {
      params: limit ? { limit } : undefined,
    });
    return res.data.map(transformProduct);
  },

  async search(
    keyword: string,
    opts?: { page?: number; pageSize?: number; sortBy?: string },
  ): Promise<{ items: Product[]; hasMore: boolean; total: number }> {
    if (isMockMode) {
      const lower = keyword.toLowerCase();
      const filtered = withMockCategoryTop3(mockDb.products).filter((p) => {
        const name = p.name[getCurrentLocale()] ?? p.name.en;
        return name.toLowerCase().includes(lower);
      });
      // Why: C方案 §6 F1 - mock 分支补 pageSize 透传（联想 pageSize=3 只取前 3），不传则一次性返全部
      //   保持 hasMore=false 让 infinite query 不触发下一页（P8 §5.5），P8 结果页 useProductSearch 不传 pageSize 行为不变
      const paged = opts?.pageSize ? filtered.slice(0, opts.pageSize) : filtered;
      return mockResponse({ items: paged, hasMore: false, total: filtered.length }, 500);
    }
    // Why: 保留 hasMore/total（之前丢掉导致无法真实分页），P8 决策 3-B
    // Why: C方案 §6 F1 - 补 pageSize 透传（联想 pageSize=3），P8 useProductSearch 不传 pageSize 行为不变
    const res = await api.get<ProductListResponse>('/client/products/search', {
      params: {
        keyword,
        ...(opts?.page && { page: opts.page }),
        ...(opts?.pageSize && { pageSize: opts.pageSize }),
        ...(opts?.sortBy && { sortBy: opts.sortBy }),
      },
    });
    return {
      items: res.data.items.map(transformProduct),
      hasMore: res.data.hasMore,
      total: res.data.total,
    };
  },

  async getByCategory(categoryId: string): Promise<Product[]> {
    if (isMockMode) {
      const filtered = mockDb.products.filter((p) => p.category === categoryId);
      // Why: P9 - mock 按销量降序（同 getProducts），让分类列表也是热销顺序
      const sorted = [...filtered].sort((a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0));
      return mockResponse(withMockCategoryTop3(sorted));
    }
    // Why: 后端无独立 by-category 端点，复用 listProducts 传 categoryId
    return this.getProducts({ categoryId });
  },

  /**
   * 批D D5/D11 就近仓可用性：GET /client/products/:id/warehouse-availability?lat&lng
   * 返回 null 表示「本次无数据」→ UI 整块隐藏（端点未部署门禁 / 商品不存在 / 端点异常降级），
   * 不阻塞详情页主流程（方案 D5 fallback 不阻塞）。
   */
  async getWarehouseAvailability(
    id: string,
    lat: number,
    lng: number,
  ): Promise<WarehouseAvailability | null> {
    if (isMockMode) {
      // Why: mock 按商品库存 + 查询坐标合成演示三态（P2-2）：有库存=就近仓有货 / 库存 0=仓售罄 /
      //   坐标在帝力范围外=无匹配仓（模拟匹配失败，matchedWarehouseId:null → UI 无货态）。
      //   商品不存在/无库存字段 → null（UI 隐藏）。
      const p = mockDb.products.find((x) => x.id === id);
      if (!p || p.stock == null) return mockResponse(null);
      // Dili 中心 (-8.5569,125.5603) 附近视为有匹配仓（粗略包围盒，仅演示用）
      const inDiliArea = lat > -9.2 && lat < -8.3 && lng > 125.0 && lng < 125.9;
      if (!inDiliArea) {
        return mockResponse({
          matchedWarehouseId: null,
          warehouseName: null,
          quantity: 0,
          available: false,
        });
      }
      return mockResponse({
        matchedWarehouseId: `mock-warehouse-${p.id}`,
        warehouseName: 'Dili Central Warehouse',
        quantity: p.stock,
        available: p.stock > 0,
      });
    }
    if (!WAREHOUSE_AVAILABILITY_READY) return null;
    try {
      const res = await api.get<WarehouseAvailability>(
        `/client/products/${id}/warehouse-availability`,
        { params: { lat, lng } },
      );
      return res.data;
    } catch {
      // Why: 展示增强非主流程 — 端点异常/未部署降级 null（UI 隐藏该区块），不弹错不阻塞
      return null;
    }
  },
};
