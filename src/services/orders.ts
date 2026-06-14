import { isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import type { Order, OrderStatus } from '@/types';

export const orderApi = {
  async getOrders(status?: OrderStatus | 'all'): Promise<Order[]> {
    if (isMockMode) {
      const list =
        status && status !== 'all'
          ? mockDb.orders.filter((o) => o.status === status)
          : mockDb.orders;
      return mockResponse(list);
    }
    throw new Error('Real API not implemented');
  },
  async getOrder(id: string): Promise<Order | undefined> {
    if (isMockMode) {
      return mockResponse(mockDb.orders.find((o) => o.id === id));
    }
    throw new Error('Real API not implemented');
  },
  async createOrder(items: Order['items'], totalPrice: number): Promise<Order> {
    if (isMockMode) {
      const newOrder: Order = {
        id: `o${Date.now()}`,
        orderNo: `MM${Date.now()}`,
        status: 'pending',
        items,
        totalPrice,
        createdAt: new Date().toISOString(),
      };
      mockDb.orders.unshift(newOrder);
      return mockResponse(newOrder);
    }
    throw new Error('Real API not implemented');
  },
  async cancelOrder(id: string): Promise<Order> {
    if (isMockMode) {
      const order = mockDb.orders.find((o) => o.id === id);
      if (order) order.status = 'cancelled';
      return mockResponse(order as Order);
    }
    throw new Error('Real API not implemented');
  },
};
