import { isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import type { User, Coupon, Product, Notification } from '@/types';

export const userApi = {
  async getProfile(): Promise<User> {
    if (isMockMode) return mockResponse(mockDb.user);
    throw new Error('Real API not implemented');
  },
  async updateProfile(updates: Partial<User>): Promise<User> {
    if (isMockMode) {
      Object.assign(mockDb.user, updates);
      return mockResponse(mockDb.user);
    }
    throw new Error('Real API not implemented');
  },
  async getCoupons(): Promise<Coupon[]> {
    if (isMockMode) return mockResponse(mockDb.coupons);
    throw new Error('Real API not implemented');
  },
  async getFavorites(): Promise<Product[]> {
    if (isMockMode) {
      return mockResponse([mockDb.products[0], mockDb.products[3], mockDb.products[7]]);
    }
    throw new Error('Real API not implemented');
  },
  async getNotifications(): Promise<Notification[]> {
    if (isMockMode) return mockResponse(mockDb.notifications);
    throw new Error('Real API not implemented');
  },
  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    if (isMockMode) {
      const n = mockDb.notifications.find((item) => item.id === id);
      if (n) n.read = true;
      return mockResponse({ success: true });
    }
    throw new Error('Real API not implemented');
  },
};
