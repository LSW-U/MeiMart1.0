import { api, isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import type { CartItem, Order, OrderStatus } from '@/types';

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
  // 缺货履约闭环批2（2026-10-24）：批1 后端 OrderItem 已透出缺货标记（可空，向后兼容），
  // 透传给详情页渲染缺货 badge；null/缺失 = 未登记缺货
  outOfStockQty?: number | null;
  // 替换品批1（2026-10-29）：PENDING 建议待决策标记（可空）——详情页据此渲染确认弹层；
  // suggestionDecidedAt 仅展示用（决策时间）
  suggestionStatus?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | null;
  suggestionDecidedAt?: string | null;
  // 替换品批1 P2-3 修复（2026-10-29）：建议目标摘要（契约只增，可空向后兼容）——
  // 确认弹层渲染真实原/替对比 + 差额行的数据源（D1 clamp min 由前端明示）
  suggestionItem?: { name: unknown; image: string | null; unitPrice: number } | null;
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
  // 替换品批1（2026-10-29 D9/D13）：下单替换策略 + SPECIFY 白名单（可空，向后兼容）——
  // checkout SPECIFY UI 与详情页提示用；缺省 = 后端未升级（降级为 ALLOW 展示）
  replacementPolicy?: 'ALLOW' | 'SPECIFY' | 'NONE' | null;
  allowedReplacementSkuIds?: string[] | null;
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
  // 批1 审查 P1-1：events 仅详情/列表端点 include；createOrder 响应无此字段（可选）。
  // 缺失即契约破坏（transform 内直取上抛），仅 createOrder 分支调用前显式归一化补 []。
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
  // Why: 批A 汇率快照（批B ≈¥ 显示消费）：人民币通道下单锁定，非人民币通道 null
  exchangeRate?: number | null;
  estimatedCnyAmount?: number | null;
  // Why: 预约单标注（保证金批A T5-c / 批D D2）：scheduledFor 非空 = 走了预约（开门后可配送）。
  //      批D 审查 P3-3：createOrder 响应虽另带 acceptingReservation，但语义等价于 scheduledFor 非 null
  //      （order.service: acceptingReservation = scheduledFor !== null），前端统一以 scheduledFor 判定，不重复映射。
  scheduledFor?: string | null;
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
  // 替换品批1（2026-10-29 D9/D13）：下单替换策略 + SPECIFY 白名单（可选，缺省后端默认 ALLOW；
  // superRefine 约束：SPECIFY ⇒ 白名单非空，非 SPECIFY ⇒ 禁传白名单）
  replacementPolicy?: 'ALLOW' | 'SPECIFY' | 'NONE';
  allowedReplacementSkuIds?: string[];
}

// Why: 后端 OrderItem 扁平结构，前端 CartItem 需要嵌套 Product；构造最小 Product 避免再 fetch 详情
// 兜底：字段缺失时用默认值，防 NaN/undefined 渲染崩溃
// 批1 A4 透传（D9 删本地 pickLocalized）：productName 多语 JSON 原样透传，渲染层 localize() 取值
function transformOrderItem(raw: OrderItemRaw): CartItem {
  return {
    id: raw.id ?? '',
    product: {
      id: raw.productId ?? '',
      name: (raw.productName ?? {}) as CartItem['product']['name'],
      price: (raw.unitPrice ?? 0) / 100,
      image: raw.productImage ?? '',
      category: '',
    },
    quantity: raw.quantity ?? 1,
    selected: true,
    // 批2：缺货数量透传（null = 未登记缺货，详情页按 null/undefined 隐藏 badge）
    outOfStockQty: raw.outOfStockQty ?? null,
    // 替换品批1（2026-10-29）：建议决策状态透传（null/undefined = 无建议，详情页不渲染弹层）
    suggestionStatus: raw.suggestionStatus ?? null,
    suggestionDecidedAt: raw.suggestionDecidedAt ?? null,
    // P2-3 修复：建议目标摘要透传（分→元由弹层渲染层换算，与原项口径一致走 raw 分）
    suggestionItem: raw.suggestionItem ?? null,
  };
}

function transformOrder(raw: OrderRaw): Order {
  return {
    id: raw.id ?? '',
    orderNo: raw.orderNo ?? '',
    status: raw.status ?? 'PENDING_PAYMENT',
    // 批1 T1（D7）：撤 `?? []` 兜底——响应缺失 items/events 属后端契约破坏，让异常上抛
    //（静默空列表会把「详情渲染为空」伪装成正常态）。页面层 4 处 `order?.items ?? []`
    // 属可选守卫不在本清理范围（方案v2 N1）。
    items: raw.items.map(transformOrderItem),
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
    // 批1 T1（D7）：详情/列表端点按契约 include events，缺失即异常上抛（同 items 口径）。
    // 批1 审查 P1-1：createOrder 响应后端本就不含 events（order.service.ts return 对象），
    // 属已知合法形态非契约破坏——由 createOrder 分支调用前显式归一化补 []，transform 内直取。
    events: raw.events.map((e) => ({
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
    // Why: 批B ≈¥ 显示 - 汇率快照（万分位）+ 人民币估算金额（分），非人民币通道 null
    exchangeRate: raw.exchangeRate ?? null,
    estimatedCnyAmount: raw.estimatedCnyAmount ?? null,
    // Why: 预约单标注（保证金批A T5-c / 批D D2）：scheduledFor 非空 = 走了预约（开门后可配送）
    scheduledFor: raw.scheduledFor ?? null,
    // 替换品批1（2026-10-29 D9/D13）：替换策略透传（缺省降级 ALLOW，详情页/checkout 按 ALLOW 展示）
    replacementPolicy: raw.replacementPolicy ?? null,
    allowedReplacementSkuIds: raw.allowedReplacementSkuIds ?? null,
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

  // ============================================================================
  // 批3（#5 订单删除）：删除订单（单条/批量）。mock 分支对 mockDb.orders（模块级内存数组，
  // JSON 不落盘，会话级生效）过滤；real 分支删单条 DELETE /:id、批量 POST /batch-delete
  // （端点归批4 后端方案 md P27——软删 deletedAt，未实现前 mock 门禁按基线处理）。
  // ============================================================================
  async deleteOrder(id: string): Promise<{ success: boolean }> {
    if (isMockMode) {
      mockDb.orders = mockDb.orders.filter((o) => o.id !== id);
      return mockResponse({ success: true });
    }
    const res = await api.delete<{ success: boolean }>(`/client/orders/${id}`);
    return res.data;
  },

  async deleteOrders(ids: string[]): Promise<{ success: boolean }> {
    if (ids.length === 0) return { success: true };
    if (isMockMode) {
      const set = new Set(ids);
      mockDb.orders = mockDb.orders.filter((o) => !set.has(o.id));
      return mockResponse({ success: true });
    }
    const res = await api.post<{ success: boolean }>('/client/orders/batch-delete', { ids });
    return res.data;
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
    const res = await api.post<OrderRaw>(
      '/client/orders',
      { ...payload, items },
      {
        headers: { 'Idempotency-Key': idempotencyKey },
      },
    );
    // 批1 审查 P1-1：后端 createOrder 响应不含 events（MeiMart order.service.ts return
    // 对象仅 items/金额/状态；详情/列表端点才 include events）。createOrder 下单后本地
    // 无事件流可展示，归一化补空数组后走 transformOrder（详情页事件流由 getOrder 提供）。
    return transformOrder({ ...res.data, events: res.data.events ?? [] });
  },

  // 替换品批1（2026-10-29 D5/D8/D1）：建议决策结果（refundedAmount 分→元在页面层折算展示）
  async decideSuggestion(
    orderId: string,
    itemId: string,
    input: { accept: boolean; replacementItemId?: string },
  ): Promise<{
    itemId: string;
    orderId: string;
    suggestionStatus: 'ACCEPTED' | 'DECLINED';
    replacementItemId: string | null;
    refundedAmount: number;
  }> {
    if (isMockMode) {
      // mock：原地改 mockDb 内 items 状态（无 suggestionStatus 数据时仅回执）
      void mockDb;
      return mockResponse({
        itemId,
        orderId,
        suggestionStatus: (input.accept ? 'ACCEPTED' : 'DECLINED') as 'ACCEPTED' | 'DECLINED',
        replacementItemId: input.replacementItemId ?? null,
        refundedAmount: 0,
      });
    }
    const res = await api.post<{
      itemId: string;
      orderId: string;
      suggestionStatus: 'ACCEPTED' | 'DECLINED';
      replacementItemId: string | null;
      refundedAmount: number;
    }>(`/client/orders/${orderId}/items/${itemId}/suggestion/decision`, input);
    return res.data;
  },

  async cancelOrder(id: string, reason?: string): Promise<Order> {
    if (isMockMode) {
      const order = mockDb.orders.find((o) => o.id === id);
      if (order) order.status = 'CANCELLED';
      return mockResponse(order as Order);
    }
    await api.post(`/client/orders/${id}/cancel`, { reason: reason ?? DEFAULT_CANCEL_REASON });
    // Why: cancel 接口返回 {id, status}，没有完整 Order，重新拉详情避免类型不匹配。
    // C-P2-7: getOrder 返回 Order | undefined——未定义（已取消单被并发删除等）显式抛错，
    //   不再 `as Promise<Order>` 强转谎报类型（undefined 流入调用方触发运行时崩）。
    const order = await this.getOrder(id);
    if (!order) throw new Error(`Order ${id} not found after cancel`);
    return order;
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
