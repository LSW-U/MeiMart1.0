import { api, isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import { getCurrentLocale } from '@/i18n';
import type { Product } from '@/types';

// Why: 后端 Product 字段名/单位与前端类型有差异，service 层做转换避免改组件代码。
// 后端金额单位是「分」（整数），前端 Product.price 用「元」，转换时 /100。
interface ProductRaw {
  id: string;
  shopId: string;
  categoryId: string | null;
  name: Record<string, string>;
  description: Record<string, string> | null;
  mainImage: string;
  images: string[];
  status: string;
  unit: Record<string, string>;
  priceMin: number;
  salesCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ProductListResponse {
  items: ProductRaw[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

// Why: mock 数据 price 已是元，real 数据 priceMin 是分，转换函数只在 real 分支调用，避免双倍转换
function transformProduct(raw: ProductRaw): Product {
  return {
    id: raw.id,
    // 后端 name 是 Record<string,string>，前端 LocalizableText 结构等价（含部分 locale key 缺失时由组件 fallback）
    name: raw.name as Product['name'],
    price: raw.priceMin / 100,
    image: raw.mainImage,
    category: raw.categoryId ?? '',
    salesCount: raw.salesCount,
    description: (raw.description ?? undefined) as Product['description'],
  };
}

interface ProductListQuery {
  categoryId?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export const productApi = {
  async getProducts(query?: ProductListQuery): Promise<Product[]> {
    if (isMockMode) return mockResponse(mockDb.products);
    const res = await api.get<ProductListResponse>('/client/products', { params: query });
    return res.data.items.map(transformProduct);
  },

  async getProduct(id: string): Promise<Product | undefined> {
    if (isMockMode) {
      const found = mockDb.products.find((p) => p.id === id);
      return mockResponse(found);
    }
    const res = await api.get<ProductRaw & { skus: unknown[] }>(`/client/products/${id}`);
    // Why: 详情接口额外返回 skus，前端 Product 类型暂未消费，忽略以保持兼容
    return transformProduct(res.data);
  },

  async getRecommendations(limit?: number): Promise<Product[]> {
    if (isMockMode) return mockResponse(mockDb.products.slice(0, 6));
    const res = await api.get<ProductRaw[]>('/client/products/recommendations', {
      params: limit ? { limit } : undefined,
    });
    return res.data.map(transformProduct);
  },

  async getBuyAgain(limit?: number): Promise<Product[]> {
    if (isMockMode) return mockResponse(mockDb.products.slice(6, 10));
    // Why: buy-again 是后端专属端点，不是前端按 tag 过滤
    const res = await api.get<ProductRaw[]>('/client/products/buy-again', {
      params: limit ? { limit } : undefined,
    });
    return res.data.map(transformProduct);
  },

  async search(keyword: string, page?: number): Promise<Product[]> {
    if (isMockMode) {
      const lower = keyword.toLowerCase();
      const filtered = mockDb.products.filter((p) => {
        const name = p.name[getCurrentLocale()] ?? p.name.en;
        return name.toLowerCase().includes(lower);
      });
      return mockResponse(filtered, 500);
    }
    // Why: search 走 listProducts 内部实现，返回分页结构 {items, ...}，service 提取 items
    const res = await api.get<ProductListResponse>('/client/products/search', {
      params: { keyword, ...(page ? { page } : {}) },
    });
    return res.data.items.map(transformProduct);
  },

  async getByCategory(categoryId: string): Promise<Product[]> {
    if (isMockMode) {
      const filtered = mockDb.products.filter((p) => p.category === categoryId);
      return mockResponse(filtered);
    }
    // Why: 后端无独立 by-category 端点，复用 listProducts 传 categoryId
    return this.getProducts({ categoryId });
  },
};
