import { api, isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import type { CartItem, Order, OrderStatus } from '@/types';
import { getCurrentLocale } from '@/i18n';

// Why: 后端 CancelOrderRequest 契约 reason 必填（z.string().min(1).max(200)），
// 不传 body 触发 ZodValidationPipe 400。当前 UI 无取消原因选择（HTML 原型无 cancel UI），
// service 层兜底默认值保留后端审计能力；未来组件传 reason 覆盖即可。
// Why: reason 是审计字段（非 UI 文案），固定英文常量供运营/admin 日志可读，不走 i18n。
const DEFAULT_CANCEL_REASON = 'User cancelled';

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
  // Why: P10 §3.5 + P11 §3.2 骑手详情（后端项 1 方案 A：getOrderDetail include rider，toOrderWithRelations 平铺 avatarUrl + rating toString；real 模式 rider=null 时整个 undefined）
  rider?: {
    id: string;
    riderName: string;
    phone: string;
    rating: string | null;
    totalDeliveries: number;
    vehicleType: string;
    avatarUrl: string | null;
  } | null;
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
  // Why: P28 订单结果页 - 待支付倒计时截止（ISO），后端契约 createdAt + 15min（D11）
  payDeadline?: string | null;
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
// 兜底：字段缺失时用默认值，防 NaN/undefined 渲染崩溃
function transformOrderItem(raw: OrderItemRaw): CartItem {
  return {
    id: raw.id ?? '',
    product: {
      id: raw.productId ?? '',
      name: { zh: pickLocalized(raw.productName), en: pickLocalized(raw.productName) } as CartItem['product']['name'],
      price: (raw.unitPrice ?? 0) / 100,
      image: raw.productImage ?? '',
      category: '',
    },
    quantity: raw.quantity ?? 1,
    selected: true,
  };
}

function transformOrder(raw: OrderRaw): Order {
  return {
    id: raw.id ?? '',
    orderNo: raw.orderNo ?? '',
    status: raw.status ?? 'PENDING_PAYMENT',
    // Why: 后端 createOrder 响应不含 items（只有金额/状态），用空数组兜底避免 .map 报错
    items: (raw.items ?? []).map(transformOrderItem),
    totalPrice: (raw.payableAmount ?? raw.totalAmount ?? 0) / 100,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    // Why: P10 §8.1 D1/D2 - 费用 + 支付方式（后端分→元 / paymentMethod 透传枚举字符串）
    deliveryFee: (raw.deliveryFee ?? 0) / 100,
    discountAmount: (raw.discountAmount ?? 0) / 100,
    paymentMethod: raw.paymentMethod ?? undefined,
    // Why: P10 §3.5 + P11 §3.2 骑手详情映射（OrderRaw.rider → Order.rider: RiderInfo，后端项 1 就绪后透传；rating Decimal→number）
    rider: raw.rider
      ? {
          name: raw.rider.riderName,
          phone: raw.rider.phone,
          avatar: raw.rider.avatarUrl ?? undefined,
          rating: raw.rider.rating != null ? Number(raw.rider.rating) : undefined,
          totalDeliveries: raw.rider.totalDeliveries,
          vehicleType: raw.rider.vehicleType,
        }
      : undefined,
    // Why: P10 Timeline 真实时间戳（§8.1 P0）- 透传后端 7 个时间戳，null 表示订单尚未到达该状态
    paidAt: raw.paidAt ?? null,
    confirmedAt: raw.confirmedAt ?? null,
    pickedAt: raw.pickedAt ?? null,
    deliveringAt: raw.deliveringAt ?? null,
    deliveredAt: raw.deliveredAt ?? null,
    completedAt: raw.completedAt ?? null,
    cancelledAt: raw.cancelledAt ?? null,
    // Why: P10 §8.1 events[] 真实事件流，timeline 精细化备用 + P11 共享
    events: (raw.events ?? []).map((e) => ({
      id: e.id ?? '',
      eventType: e.eventType ?? '',
      fromStatus: e.fromStatus ?? null,
      toStatus: e.toStatus ?? 'PENDING_PAYMENT',
      operatorId: e.operatorId ?? null,
      metadata: e.metadata,
      createdAt: e.createdAt ?? '',
    })),
    // Why: P28 - 透传待支付截止时间，null 表示非待支付态（D11）
    payDeadline: raw.payDeadline ?? null,
  };
}

export const orderApi = {
  async getOrders(
    status?: OrderStatus[] | 'all',
    cursor?: string,
    limit = 20,
  ): Promise<{ items: Order[]; nextCursor: string | null; hasMore: boolean }> {
    if (isMockMode) {
      // Why: mock 数据存旧字面量（pending/paid/...），filter 用 legacyStatusMap 映射后的新值匹配 status[]
      //      （原 o.status === status 用旧值匹配新值，非 'all' 时漏单；本次 B2 顺手修）
      const list =
        status && status !== 'all'
          ? mockDb.orders.filter((o) => status.includes(legacyStatusMap(o.status)))
          : mockDb.orders;
      const mapped = list.map((o) => ({ ...o, status: legacyStatusMap(o.status) }));
      return mockResponse({ items: mapped, nextCursor: null, hasMore: false });
    }
    const params: Record<string, unknown> = { limit };
    if (status && status !== 'all') {
      // P12 B2:后端 /client/orders 已支持多状态过滤（逗号分隔），传 join(',')
      params.status = status.join(',');
    }
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
    await api.post(`/client/orders/${id}/cancel`, { reason: reason ?? DEFAULT_CANCEL_REASON });
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
      estimatedArrival: string | null;
    } | null;
  }> {
    if (isMockMode) {
      // P11 ETA 联调：mock task 含 estimatedArrival（now + 45min，对齐后端 DEFAULT_ETA_MINUTES）
      return mockResponse({
        orderId: id,
        orderNo: 'mock',
        orderStatus: 'OUT_FOR_DELIVERY' as OrderStatus,
        paymentStatus: 'PAID',
        task: {
          taskId: 'mock-task',
          taskStatus: 'OUT_FOR_DELIVERY',
          riderId: null,
          pickedUpAt: null,
          deliveredAt: null,
          riderLocation: null,
          estimatedArrival: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        },
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

  // P12 B1:订单状态计数（后端 getOrderCounts groupBy 全状态 0 填充，解决列表派生 limit=20 偏低）
  async getOrderCounts(): Promise<{ counts: Record<string, number> }> {
    if (isMockMode) {
      // mock:从 mockDb.orders 按 status 聚合（legacyStatusMap 后），10 枚举 0 填充对齐后端
      const ALL_STATUSES: OrderStatus[] = [
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
      const counts: Record<string, number> = {};
      for (const s of ALL_STATUSES) counts[s] = 0;
      for (const o of mockDb.orders) {
        const s = legacyStatusMap(o.status);
        counts[s] = (counts[s] ?? 0) + 1;
      }
      return mockResponse({ counts });
    }
    const res = await api.get<{ counts: Record<string, number> }>('/client/orders/counts');
    return { counts: res.data.counts };
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
