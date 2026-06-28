import { api, isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import type { CartItem, Order, OrderStatus } from '@/types';
import { getCurrentLocale } from '@/i18n';

// Why: 后端 Order 字段名/单位/结构差异大（金额分/元、status 大写枚举、items 扁平化、events 数组），
// service 层做转换避免改组件代码。后端金额单位是分（整数），前端用元。
interface OrderItemRaw {
  id: string;
  productId: string;
  skuId: string;
  productName: unknown;
  productImage: string;
  skuName: unknown;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

interface OrderRaw {
  id: string;
  orderNo: string;
  userId: string;
  warehouseId: string;
  status: OrderStatus;
  totalAmount: number;
  deliveryFee: number;
  discountAmount: number;
  payableAmount: number;
  deliveryAddress: unknown;
  remark: string | null;
  riderId: string | null;
  paymentMethod: string;
  paymentStatus: string;
  paidAt: string | null;
  createdAt: string;
  confirmedAt: string | null;
  pickedAt: string | null;
  deliveringAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  items: OrderItemRaw[];
  events: {
    id: string;
    eventType: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    operatorId: string | null;
    metadata: unknown;
    createdAt: string;
  }[];
}

interface OrderListResponse {
  items: OrderRaw[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface CreateOrderPayload {
  addressId: string;
  remark?: string;
  paymentMethod: string;
}

function pickLocalized(raw: unknown, fallback = ''): string {
  if (!raw || typeof raw !== 'object') return fallback;
  const record = raw as Record<string, string>;
  const locale = getCurrentLocale();
  return record[locale] ?? record.en ?? record.zh ?? Object.values(record)[0] ?? fallback;
}

// Why: 后端 OrderItem 扁平结构，前端 CartItem 需要嵌套 Product；构造最小 Product 避免再 fetch 详情
function transformOrderItem(raw: OrderItemRaw): CartItem {
  return {
    id: raw.id,
    product: {
      id: raw.productId,
      name: { zh: pickLocalized(raw.productName), en: pickLocalized(raw.productName) } as CartItem['product']['name'],
      price: raw.unitPrice / 100,
      image: raw.productImage,
      category: '',
    },
    quantity: raw.quantity,
    selected: true,
  };
}

function transformOrder(raw: OrderRaw): Order {
  return {
    id: raw.id,
    orderNo: raw.orderNo,
    status: raw.status,
    items: raw.items.map(transformOrderItem),
    totalPrice: raw.payableAmount / 100,
    createdAt: raw.createdAt,
  };
}

export const orderApi = {
  async getOrders(
    status?: OrderStatus | 'all',
    cursor?: string,
    limit = 20,
  ): Promise<{ items: Order[]; nextCursor: string | null; hasMore: boolean }> {
    if (isMockMode) {
      const list =
        status && status !== 'all'
          ? mockDb.orders.filter((o) => o.status === status)
          : mockDb.orders;
      // Why: mock 数据按 5 个旧 status 排布，给旧 mock 数据做新枚举值的兜底映射
      const mapped = list.map((o) => ({ ...o, status: legacyStatusMap(o.status) }));
      return mockResponse({ items: mapped, nextCursor: null, hasMore: false });
    }
    const params: Record<string, unknown> = { limit };
    if (status && status !== 'all') params.status = status;
    if (cursor) params.cursor = cursor;
    const res = await api.get<OrderListResponse>('/client/orders', { params });
    return {
      items: res.data.items.map(transformOrder),
      nextCursor: res.data.nextCursor,
      hasMore: res.data.hasMore,
    };
  },

  async getOrder(id: string): Promise<Order | undefined> {
    if (isMockMode) {
      const found = mockDb.orders.find((o) => o.id === id);
      return mockResponse(found ? { ...found, status: legacyStatusMap(found.status) } : undefined);
    }
    const res = await api.get<OrderRaw>(`/client/orders/${id}`);
    return transformOrder(res.data);
  },

  // Why: Idempotency-Key header 用 crypto.randomUUID()，重试用同一 key 后端会回放缓存订单
  async createOrder(
    items: { skuId: string; quantity: number }[],
    payload: CreateOrderPayload,
  ): Promise<Order> {
    if (isMockMode) {
      const newOrder: Order = {
        id: `o${Date.now()}`,
        orderNo: `MM${Date.now()}`,
        status: 'PENDING_PAYMENT',
        items: [],
        totalPrice: 0,
        createdAt: new Date().toISOString(),
      };
      mockDb.orders.unshift(newOrder);
      return mockResponse(newOrder);
    }
    const idempotencyKey = crypto.randomUUID();
    const res = await api.post<OrderRaw>('/client/orders', { ...payload, items }, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return transformOrder(res.data);
  },

  async cancelOrder(id: string, reason?: string): Promise<Order> {
    if (isMockMode) {
      const order = mockDb.orders.find((o) => o.id === id);
      if (order) order.status = 'CANCELLED';
      return mockResponse(order as Order);
    }
    await api.post(`/client/orders/${id}/cancel`, { ...(reason ? { reason } : {}) });
    // Why: cancel 接口返回 {id, status}，没有完整 Order，重新拉详情避免类型不匹配
    return this.getOrder(id) as Promise<Order>;
  },

  // Why: tracking 端点返回 {orderId, orderNo, orderStatus, paymentStatus, task}
  // 主要给 WS 断线时 HTTP 轮询兜底用，service 返回原始结构由调用方处理
  async getTracking(id: string): Promise<{
    orderId: string;
    orderNo: string;
    orderStatus: OrderStatus;
    paymentStatus: string;
    task: {
      taskId: string;
      taskStatus: string;
      riderId: string | null;
      pickedUpAt: string | null;
      deliveredAt: string | null;
      riderLocation: null;
      estimatedArrival: null;
    } | null;
  }> {
    if (isMockMode) {
      return mockResponse({
        orderId: id,
        orderNo: 'mock',
        orderStatus: 'OUT_FOR_DELIVERY' as OrderStatus,
        paymentStatus: 'PAID',
        task: null,
      });
    }
    const res = await api.get<{
      orderId: string;
      orderNo: string;
      orderStatus: OrderStatus;
      paymentStatus: string;
      task: unknown;
    }>(`/client/orders/${id}/tracking`);
    return res.data as Awaited<ReturnType<typeof orderApi.getTracking>>;
  },
};

// Why: mock 数据库存的是旧 6 值 status，新枚举值 10 个，做兜底映射避免 mock 显示错乱
function legacyStatusMap(s: OrderStatus): OrderStatus {
  // 已是新枚举值直接返回
  const newValues: OrderStatus[] = [
    'PENDING_PAYMENT',
    'PENDING_CONFIRM',
    'CONFIRMED',
    'PICKED',
    'OUT_FOR_DELIVERY',
    'DELIVERED_PAID',
    'DELIVERED_UNPAID',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
  ];
  if (newValues.includes(s)) return s;
  // 兼容旧字面量（运行时只在 mock 数据是旧字面量时生效，TS 编译已不允许旧字面量）
  const legacy = s as string;
  const map: Record<string, OrderStatus> = {
    pending: 'PENDING_PAYMENT',
    paid: 'CONFIRMED',
    shipped: 'OUT_FOR_DELIVERY',
    delivered: 'DELIVERED',
    cancelled: 'CANCELLED',
    refunding: 'CANCELLED',
  };
  return map[legacy] ?? 'PENDING_PAYMENT';
}
