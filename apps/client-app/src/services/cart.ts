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
  // F5：后端 CartView（apps/api cart.service.ts:62）暂无折扣字段——discount 只在 checkout-preview 端点聚合。
  // 后端 CartView 加 discountAmount（分单位）后此处补透传：`discountAmount: (raw.discountAmount ?? 0) / 100`
  discountAmount?: number;
}

function pickLocalized(raw: unknown, fallback = ''): string {
  if (!raw || typeof raw !== 'object') return fallback;
  const record = raw as Record<string, string>;
  const locale = getCurrentLocale();
  return record[locale] ?? record.en ?? record.zh ?? Object.values(record)[0] ?? fallback;
}

/**
 * 批3 第11项（批2 转办 P2-2）：确定性业务 4xx 抛 name==='BusinessError'。
 * useOfflineMutation 守卫（err.name === 'BusinessError'）对这类失败不入队——
 * 库存不足/已售罄等重试也不会成功，入队只会造成失败重放循环。
 * 复用稳定错误标识（SOLD_OUT / STOCK_EXCEEDED / NO_SKU）作 message，组件层按文案映射不变。
 */
export function businessError(message: string): Error {
  const err = new Error(message);
  err.name = 'BusinessError';
  return err;
}

function transformCartItem(raw: CartItemRaw): CartItem {
  // Why: 后端 CartItemView 扁平结构，前端 CartItem 需嵌套 Product；构造最小 Product 避免再 fetch
  // 兜底：字段缺失时用默认值，防 NaN/undefined 渲染崩溃
  // C-P2-9: 透传 skuId（CartItemView 自带，结算 createOrder 直接用）——原 checkout 提交时
  //   对每个选中项额外 getProduct 查 defaultSkuId（N 次详情请求），现从购物车数据直接取。
  return {
    id: raw.id ?? '',
    product: {
      id: raw.productId ?? '',
      name: {
        zh: pickLocalized(raw.productName),
        en: pickLocalized(raw.productName),
      } as Product['name'],
      price: (raw.unitPrice ?? 0) / 100,
      image: raw.productImage ?? '',
      category: '',
      defaultSkuId: raw.skuId ?? undefined,
    } as Product,
    quantity: raw.quantity ?? 1,
    selected: raw.isSelected ?? false,
  };
}

function transformCart(raw: CartRaw): Cart {
  const items = (raw.items ?? []).map(transformCartItem);
  return {
    items,
    totalPrice: (raw.selectedSubtotal ?? 0) / 100,
    totalItems: items.filter((i) => i.selected).reduce((sum, i) => sum + i.quantity, 0),
    // F5：后端 CartView 就绪后透传（分→元）；当前后端无此字段，恒 0 → DISCOUNT 行 real 模式隐藏（预期行为）
    discountAmount: (raw.discountAmount ?? 0) / 100,
  };
}

export const cartApi = {
  async getCart(): Promise<Cart> {
    if (isMockMode) return mockResponse(mockDb.cart);
    const res = await api.get<CartRaw>('/client/cart');
    return transformCart(res.data);
  },

  // Why: 加购走 skuId（后端 CartItem 主键是 skuId）。
  // 列表接口不返回 skus，product.defaultSkuId 可能为空，需先查详情获取 SKU。
  async addItem(product: Product, quantity = 1): Promise<Cart> {
    if (isMockMode) {
      addOrIncrement(product, quantity);
      recalculateCart();
      return mockResponse(mockDb.cart);
    }
    const skuId = await this.resolveSkuId(product);
    await api.post('/client/cart/items', { skuId, quantity });
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
    // Why: real 模式需查详情获取 SKU ID
    const detail = await productApi.getProduct(productId);
    const skuId = detail?.defaultSkuId;
    if (!skuId) throw businessError('NO_SKU: ' + productId); // 批3#11: 确定性业务失败，不入离线队列
    await api.post('/client/cart/items', { skuId, quantity });
    return this.getCart();
  },

  // Why: 列表接口不返回 skus，需查详情获取第一个 ACTIVE SKU ID。
  // C-P2-7（排查结论）：cart.ts 各方法内 this 全部保留具名引用（无 `const { getCart } = this`
  //   解构丢绑定）；唯一风险是外部解构 cartApi.xxx 再调用，当前无此调用点。具名引用模式
  //   保持不变，此注释锁定约定：本对象方法间互调一律走 this.xxx 具名引用。
  async resolveSkuId(product: Product): Promise<string> {
    if (product.defaultSkuId) return product.defaultSkuId;
    const detail = await productApi.getProduct(product.id);
    if (!detail?.defaultSkuId) {
      throw businessError('NO_SKU: ' + product.id); // 批3#11
    }
    return detail.defaultSkuId;
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

  // C-P2-8: 批量删除收敛——逐删顺序化，仅最后一次 getCart 收口（原 N 次 DELETE 各带一次
  //   getCart 会拉到中间态；mock 本地直删天然一致）。id 顺序去重防重复 DELETE。
  async removeItems(itemIds: string[]): Promise<Cart> {
    if (isMockMode) {
      const ids = new Set(itemIds);
      mockDb.cart.items = mockDb.cart.items.filter((i) => !ids.has(i.id));
      recalculateCart();
      return mockResponse(mockDb.cart);
    }
    for (const id of [...new Set(itemIds)]) {
      await api.delete(`/client/cart/items/${id}`);
    }
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

  // Why: C-P1-2 Buy Now「显式只选本商品」——结算页只结算 selected 项，跳转前必须保证
  // 选中集合 = {本商品}：取消其它已选中项，本商品置选中。mock 直改本地；real 走
  // PATCH isSelected（同 toggleSelect），最后 getCart 拉最终状态。
  // C-P2-8: 逐 PATCH 顺序化 + 最后仅一次 getCart（同 clearSelected 竞态治理）。
  async selectOnly(productId: string): Promise<Cart> {
    if (isMockMode) {
      for (const item of mockDb.cart.items) {
        item.selected = item.product.id === productId;
      }
      recalculateCart();
      return mockResponse(mockDb.cart);
    }
    const current = await this.getCart();
    const others = current.items.filter((i) => i.selected && i.product.id !== productId);
    for (const i of others) {
      await api.patch(`/client/cart/items/${i.id}`, { isSelected: false });
    }
    const target = current.items.find((i) => i.product.id === productId);
    // 本商品已在购物车且未选中 → 置选中；不在购物车（addItem 后 onSettled invalidate 拉回前/
    // 或本来就没加过）无需 toggle——addItem 乐观更新已把它置 selected:true 入缓存
    if (target && !target.selected) {
      await api.patch(`/client/cart/items/${target.id}`, { isSelected: true });
    }
    return this.getCart();
  },

  // Why: 下单成功后清掉「已选中（即本次下单）」的购物车项，未选中项保留。
  // 后端无批量删除端点，real 模式逐个 delete。
  // C-P2-8: 顺序化（原 Promise.all 并行）——逐删之间后端购物车状态单调演进，最后仅一次
  //   getCart 收口（原并行竞态：某 DELETE 尚未落库时 getCart 已拉回含该项的旧状态）。
  async clearSelected(): Promise<Cart> {
    if (isMockMode) {
      mockDb.cart.items = mockDb.cart.items.filter((i) => !i.selected);
      recalculateCart();
      return mockResponse(mockDb.cart);
    }
    const current = await this.getCart();
    const selectedIds = current.items.filter((i) => i.selected).map((i) => i.id);
    for (const id of selectedIds) {
      await api.delete(`/client/cart/items/${id}`);
    }
    // 仅在确有删除时拉一次终态；无选中项直接返回 current（省一次 GET）
    return selectedIds.length > 0 ? this.getCart() : current;
  },

  // Why: checkout-preview 是结算页关键端点（B5 聚合 discount）：
  //   入参 addressId（查仓库算运费）+ couponCode?（传券码时后端聚合 discount + couponValid）。
  //   payableAmount 已减折扣 = itemsSubtotal + deliveryFee - discount，前端直接用作实付金额。
  async checkoutPreview(
    addressId?: string,
    couponCode?: string,
  ): Promise<{
    items: CartItemRaw[];
    warehouseMatch: {
      id: string;
      code: string;
      deliveryFee: number;
      /** 预约单标注（保证金批A T5-c / 批D D2）：true = 匹配仓当前打烊，下单将走预约 */
      acceptingReservation: boolean;
      /** 打烊仓下一次开门时间 ISO；营业中 null */
      nextOpenAt: string | null;
    } | null;
    itemsSubtotal: number;
    deliveryFee: number;
    payableAmount: number;
    /** 折扣金额（B5：传 couponCode 时后端聚合，未传=0） */
    discount: number;
    /** 当前生效的券码（未选/无效时为 null） */
    couponCode: string | null;
    /** 券是否有效（minOrderAmount/有效期等校验结果） */
    couponValid: boolean;
    warnings: string[];
    /** 配送时效 ETA（B9，ISO 时间） */
    estimatedDeliveryTime: string;
  }> {
    if (isMockMode) {
      // Why: mock 模式不在此算折扣（useCheckoutPreview 在 mock 下不调，走 checkout.tsx 的 MOCK 常量）。
      //      返回结构齐全保持类型一致，discount=0 / couponCode=null。
      return mockResponse({
        items: [],
        warehouseMatch: null,
        itemsSubtotal: 0,
        deliveryFee: 0,
        payableAmount: 0,
        discount: 0,
        couponCode: null,
        couponValid: false,
        warnings: [],
        estimatedDeliveryTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }
    const res = await api.post('/client/cart/checkout-preview', {
      addressId,
      ...(couponCode ? { couponCode } : {}),
    });
    // 后端金额字段是分，/100 转元（与 orders.ts transformOrder payableAmount/deliveryFee/discount 一致，
    // checkout.tsx toFixed 显示元，不转则 Delivery Fee/Discount/Final Total 100 倍）
    const raw = res.data as {
      items: CartItemRaw[];
      warehouseMatch: {
        id: string;
        code: string;
        deliveryFee: number;
        acceptingReservation: boolean;
        nextOpenAt: string | null;
      } | null;
      itemsSubtotal: number;
      deliveryFee: number;
      payableAmount: number;
      discount: number;
      couponCode: string | null;
      couponValid: boolean;
      warnings: string[];
      estimatedDeliveryTime: string;
    };
    return {
      ...raw,
      itemsSubtotal: raw.itemsSubtotal / 100,
      deliveryFee: raw.deliveryFee / 100,
      payableAmount: raw.payableAmount / 100,
      discount: raw.discount / 100,
      warehouseMatch: raw.warehouseMatch
        ? {
            ...raw.warehouseMatch,
            deliveryFee: raw.warehouseMatch.deliveryFee / 100,
          }
        : null,
    };
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
