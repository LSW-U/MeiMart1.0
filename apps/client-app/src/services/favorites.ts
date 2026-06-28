import { api, isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import type { Product } from '@/types';

// Why: 后端 listFavorites 返回 {id, productId, product: ProductSummary, createdAt}，
// 前端 Product 类型字段名/单位有差异，service 层做转换避免改组件代码。
interface ProductSummaryRaw {
  id: string;
  name: Record<string, string>;
  image: string;
  price: number; // 分（继承自 Product.priceMin）
  status: string;
  salesCount: number;
}

interface FavoriteRaw {
  id: string;
  productId: string;
  product: ProductSummaryRaw;
  createdAt: string;
}

function transformFavorite(raw: FavoriteRaw): Product {
  // Why: ProductSummary.price 是分（继承 priceMin），转元 /100；name 多语言结构兼容
  const nameRecord = raw.product.name as Record<string, string>;
  return {
    id: raw.product.id,
    name: {
      zh: nameRecord.zh ?? nameRecord.en ?? '',
      en: nameRecord.en ?? nameRecord.zh ?? '',
    } as Product['name'],
    price: raw.product.price / 100,
    image: raw.product.image,
    category: '',
    salesCount: raw.product.salesCount,
  };
}

export const favoritesApi = {
  async list(): Promise<Product[]> {
    if (isMockMode) return mockResponse(mockDb.favorites);
    const res = await api.get<FavoriteRaw[]>('/client/favorites');
    return res.data.map(transformFavorite);
  },

  // Why: toggle 返回 {isFavorite: boolean}，不返回新列表；调用方按需 invalidate / 乐观更新
  async toggle(productId: string): Promise<{ isFavorite: boolean }> {
    if (isMockMode) {
      const idx = mockDb.favorites.findIndex((p) => p.id === productId);
      const wasFavorite = idx >= 0;
      if (wasFavorite) {
        mockDb.favorites.splice(idx, 1);
      } else {
        // Why: mock 模式 toggle 仅返回状态变化，不强行塞入未知 product（避免脏数据），调用方靠 invalidate 刷新列表
      }
      return mockResponse({ isFavorite: !wasFavorite });
    }
    const res = await api.post<{ isFavorite: boolean }>('/client/favorites/toggle', { productId });
    return res.data;
  },
};
