import { isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import type { Category, Banner } from '@/types';

export const catalogApi = {
  async getCategories(): Promise<Category[]> {
    if (isMockMode) return mockResponse(mockDb.categories);
    throw new Error('Real API not implemented');
  },
  async getBanners(): Promise<Banner[]> {
    if (isMockMode) return mockResponse(mockDb.banners);
    throw new Error('Real API not implemented');
  },
};
