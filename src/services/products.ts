import { isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import type { Product } from '@/types';

export const productApi = {
  async getProducts(): Promise<Product[]> {
    if (isMockMode) return mockResponse(mockDb.products);
    throw new Error('Real API not implemented');
  },
  async getProduct(id: string): Promise<Product | undefined> {
    if (isMockMode) {
      const found = mockDb.products.find((p) => p.id === id);
      return mockResponse(found);
    }
    throw new Error('Real API not implemented');
  },
  async getRecommendations(): Promise<Product[]> {
    if (isMockMode) return mockResponse(mockDb.products.slice(0, 6));
    throw new Error('Real API not implemented');
  },
  async search(keyword: string): Promise<Product[]> {
    if (isMockMode) {
      const filtered = mockDb.products.filter((p) => p.name.includes(keyword));
      return mockResponse(filtered, 500);
    }
    throw new Error('Real API not implemented');
  },
  async getByCategory(categoryId: string): Promise<Product[]> {
    if (isMockMode) {
      const filtered = mockDb.products.filter((p) => p.category === categoryId);
      return mockResponse(filtered);
    }
    throw new Error('Real API not implemented');
  },
};
