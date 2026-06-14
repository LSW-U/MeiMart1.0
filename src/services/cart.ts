import { isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import { productApi } from './products';
import type { Cart, CartItem, Product } from '@/types';

export const cartApi = {
  async getCart(): Promise<Cart> {
    if (isMockMode) return mockResponse(mockDb.cart);
    throw new Error('Real API not implemented');
  },
  async addItem(product: Product, quantity = 1): Promise<Cart> {
    if (isMockMode) {
      addOrIncrement(product, quantity);
      recalculateCart();
      return mockResponse(mockDb.cart);
    }
    throw new Error('Real API not implemented');
  },
  async addItemById(productId: string, quantity = 1): Promise<Cart> {
    if (isMockMode) {
      const product = mockDb.products.find((p) => p.id === productId);
      if (!product) {
        const fallback = await productApi.getProduct(productId);
        if (fallback) addOrIncrement(fallback, quantity);
      } else {
        addOrIncrement(product, quantity);
      }
      recalculateCart();
      return mockResponse(mockDb.cart);
    }
    throw new Error('Real API not implemented');
  },
  async updateItem(itemId: string, updates: Partial<CartItem>): Promise<Cart> {
    if (isMockMode) {
      const item = mockDb.cart.items.find((i) => i.id === itemId);
      if (item) Object.assign(item, updates);
      recalculateCart();
      return mockResponse(mockDb.cart);
    }
    throw new Error('Real API not implemented');
  },
  async removeItem(itemId: string): Promise<Cart> {
    if (isMockMode) {
      mockDb.cart.items = mockDb.cart.items.filter((i) => i.id !== itemId);
      recalculateCart();
      return mockResponse(mockDb.cart);
    }
    throw new Error('Real API not implemented');
  },
  async toggleSelect(itemId: string, selected: boolean): Promise<Cart> {
    if (isMockMode) {
      const item = mockDb.cart.items.find((i) => i.id === itemId);
      if (item) item.selected = selected;
      recalculateCart();
      return mockResponse(mockDb.cart);
    }
    throw new Error('Real API not implemented');
  },
};

function recalculateCart() {
  const selectedItems = mockDb.cart.items.filter((i) => i.selected);
  mockDb.cart.totalPrice = selectedItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  mockDb.cart.totalItems = selectedItems.reduce((sum, i) => sum + i.quantity, 0);
}

function addOrIncrement(product: Product, quantity: number) {
  const existing = mockDb.cart.items.find((i) => i.product.id === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    const newItem: CartItem = {
      id: `ci${Date.now()}`,
      product,
      quantity,
      selected: true,
    };
    mockDb.cart.items.push(newItem);
  }
}
