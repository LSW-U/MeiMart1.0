import { api, isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import { productApi } from './products';
import { getCurrentLocale } from '@/i18n';
import type { Cart, CartItem, Product } from '@/types';

// Why: 后端 Cart 字段名/结构差异大（CartItemView 扁平、金额单位是分、selectedSubtotal/totalSubtotal 双字段），
// service 层做转换避免改组件代码。
interface CartItemRaw {
  id: string;
  skuId: string;
  productId: string;
  productName: unknown;
  productImage: string;
  skuName: unknown;
  unitPrice: number;
  quantity: number;
  isSelected: boolean;
  addedAt: string;
}

interface CartRaw {
  id: string;
  userId: string;
  warehouseId: string | null;
  items: CartItemRaw[];
  selectedSubtotal: number;
  totalSubtotal: number;
}

function pickLocalized(raw: unknown, fallback = ''): string {
  if (!raw || typeof raw !== 'object') return fallback;
  const record = raw as Record<string, string>;
  const locale = getCurrentLocale();
  return record[locale] ?? record.en ?? record.zh ?? Object.values(record)[0] ?? fallback;
}

function transformCartItem(raw: CartItemRaw): CartItem {
  // Why: 后端 CartItemView 扁平结构，前端 CartItem 需嵌套 Product；构造最小 Product 避免再 fetch
  return {
    id: raw.id,
    product: {
      id: raw.productId,
      name: { zh: pickLocalized(raw.productName), en: pickLocalized(raw.productName) } as Product['name'],
      price: raw.unitPrice / 100,
      image: raw.productImage,
      category: '',
    } as Product,
    quantity: raw.quantity,
    selected: raw.isSelected,
  };
}

function transformCart(raw: CartRaw): Cart {
  return {
    items: raw.items.map(transformCartItem),
    totalPrice: raw.selectedSubtotal / 100,
    totalItems: raw.items.filter((i) => i.isSelected).reduce((sum, i) => sum + i.quantity, 0),
  };
}

export const cartApi = {
  async getCart(): Promise<Cart> {
    if (isMockMode) return mockResponse(mockDb.cart);
    const res = await api.get<CartRaw>('/client/cart');
    return transformCart(res.data);
  },

  // Why: 加购走 skuId（后端 CartItem 主键是 skuId），MVP 阶段假设每个 product 对应默认 sku，
  // 用 product.id 作 skuId 调后端；mock 模式保持 product 对象签名不变（组件层零改动）。
  async addItem(product: Product, quantity = 1): Promise<Cart> {
    if (isMockMode) {
      addOrIncrement(product, quantity);
      recalculateCart();
      return mockResponse(mockDb.cart);
    }
    await api.post('/client/cart/items', { skuId: product.id, quantity });
    return this.getCart();
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
    // Why: real 模式同 addItem，用 productId 作 skuId
    await api.post('/client/cart/items', { skuId: productId, quantity });
    return this.getCart();
  },

  async updateItem(itemId: string, updates: Partial<CartItem>): Promise<Cart> {
    if (isMockMode) {
      const item = mockDb.cart.items.find((i) => i.id === itemId);
      if (item) Object.assign(item, updates);
      recalculateCart();
      return mockResponse(mockDb.cart);
    }
    // Why: 后端 PATCH items/:id 接受 {quantity?, isSelected?}，前端 Partial<CartItem> 多字段做映射
    const body: Record<string, unknown> = {};
    if (updates.quantity !== undefined) body.quantity = updates.quantity;
    if (updates.selected !== undefined) body.isSelected = updates.selected;
    await api.patch(`/client/cart/items/${itemId}`, body);
    return this.getCart();
  },

  async removeItem(itemId: string): Promise<Cart> {
    if (isMockMode) {
      mockDb.cart.items = mockDb.cart.items.filter((i) => i.id !== itemId);
      recalculateCart();
      return mockResponse(mockDb.cart);
    }
    await api.delete(`/client/cart/items/${itemId}`);
    return this.getCart();
  },

  async toggleSelect(itemId: string, selected: boolean): Promise<Cart> {
    if (isMockMode) {
      const item = mockDb.cart.items.find((i) => i.id === itemId);
      if (item) item.selected = selected;
      recalculateCart();
      return mockResponse(mockDb.cart);
    }
    await api.patch(`/client/cart/items/${itemId}`, { isSelected: selected });
    return this.getCart();
  },

  // Why: checkout-preview 是结算页关键端点，返回配送费/起送价校验/仓库匹配结果
  async checkoutPreview(addressId?: string): Promise<{
    items: CartItemRaw[];
    warehouseMatch: { id: string; code: string; deliveryFee: number } | null;
    itemsSubtotal: number;
    deliveryFee: number;
    payableAmount: number;
    warnings: string[];
  }> {
    if (isMockMode) {
      return mockResponse({
        items: [],
        warehouseMatch: null,
        itemsSubtotal: 0,
        deliveryFee: 0,
        payableAmount: 0,
        warnings: [],
      });
    }
    const res = await api.post('/client/cart/checkout-preview', { addressId });
    return res.data;
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
