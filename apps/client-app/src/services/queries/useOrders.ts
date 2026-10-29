import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '@/services/orders';
import { useAuthStore } from '@/store/authStore';
import {
  ORDER_STATUS_GROUPS,
  tabStatuses,
  type OrderGroupKey,
  type OrderTabKey,
} from '@/lib/orderStatusConfig';
import type { Order, OrderStatus } from '@/types';
import {
  ORDERS_QUERY_KEY,
  ORDERS_COUNTS_KEY,
  ordersListKey,
  orderInfiniteKey,
  orderDetailKey,
  STALE_TIME,
} from '@/lib/queryKeys';

// key 定义集中迁 @/lib/queryKeys（批1 收编）；re-export 保持调用方 import 路径不变。
// 语义注解（原位保留）：批1 A4 透传后 key 去 locale 段；详情 key 落 ORDERS 前缀
// （审查报告 20260901 F1），onMutate 前缀 setQueriesData 命中详情有 Array.isArray 守卫安全。
export { ORDERS_QUERY_KEY, ordersListKey, orderInfiniteKey, orderDetailKey } from '@/lib/queryKeys';

const ORDERS_PAGE_SIZE = 20;

// Why: 兼容不依赖分页的旧组件（如 useOrderCounts 派生计数），返回 Order[]，单页 limit=20。
// P12 Commit 2: status 改成 OrderStatus[]（支持多状态过滤），'all' 表示不过滤。
export function useOrders(status?: OrderStatus[] | 'all') {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ordersListKey(status ?? 'all'),
    queryFn: async () => {
      const res = await orderApi.getOrders(status);
      return res.items;
    },
    staleTime: STALE_TIME.orders,
    networkMode: 'offlineFirst',
    enabled: isAuthenticated, // 未登录时不请求
  });
}

// P2 §4.1 + P12: 个人中心 4 宫格计数 + 列表 Tab 角标共用 ORDER_STATUS_GROUPS 单一来源。
// P12 B1: 改用后端 GET /client/orders/counts（groupBy 全状态 0 填充，不限分页），
//         替代原从 useOrders('all') 派生（消除 real 单页 limit=20 超 20 单计数偏低的 caveat）。
export function useOrderCounts(): Record<OrderGroupKey, number> {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data } = useQuery({
    queryKey: ORDERS_COUNTS_KEY,
    queryFn: () => orderApi.getOrderCounts(),
    staleTime: STALE_TIME.orders,
    networkMode: 'offlineFirst',
    enabled: isAuthenticated,
  });
  const rawCounts = data?.counts ?? {};
  const counts = {} as Record<OrderGroupKey, number>;
  for (const key of Object.keys(ORDER_STATUS_GROUPS) as OrderGroupKey[]) {
    counts[key] = ORDER_STATUS_GROUPS[key].reduce((sum, s) => sum + (rawCounts[s] ?? 0), 0);
  }
  return counts;
}

// Why: 游标分页无限加载 hook，订单列表页用。消费 service 的 nextCursor + hasMore。
// P12 Commit 2: 入参从单 status 改成 OrderTabKey（'all' | group key），内部 tabStatuses 转 OrderStatus[]。
//      修复 B2：原单 status 漏 5 状态（待发货漏 PENDING_CONFIRM 等），现按 group 查状态集。
export function useOrdersInfinite(tab: OrderTabKey = 'all') {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const statuses = tabStatuses(tab);
  return useInfiniteQuery({
    queryKey: orderInfiniteKey(tab),
    queryFn: ({ pageParam }) => orderApi.getOrders(statuses, pageParam, ORDERS_PAGE_SIZE),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    staleTime: STALE_TIME.orders,
    networkMode: 'offlineFirst',
    enabled: isAuthenticated, // 未登录时不请求
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: orderDetailKey(id ?? ''),
    queryFn: () => orderApi.getOrder(id as string),
    enabled: Boolean(id),
    networkMode: 'offlineFirst',
  });
}

interface CreateOrderVariables {
  items: { skuId: string; quantity: number }[];
  payload: {
    addressId: string;
    paymentMethod: string;
    remark?: string;
  };
  totalPrice: number;
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ items, payload }: CreateOrderVariables) => orderApi.createOrder(items, payload),
    onMutate: async ({ totalPrice }) => {
      // 乐观插入临时订单到列表，避免下单后跳列表时空白闪一下。
      // Why: items 是 {skuId, quantity} 扁平结构（service 入参），tempOrder.items 用空数组占位，
      // 真实订单回来时 onSuccess 会用完整 Order（含 transform 后的 CartItem[]）替换。
      await qc.cancelQueries({ queryKey: ORDERS_QUERY_KEY });
      const previous = qc.getQueriesData({ queryKey: ORDERS_QUERY_KEY });
      const tempId = `o${Date.now()}`;
      const tempOrder: Order = {
        id: tempId,
        orderNo: `MM${Date.now()}`,
        status: 'PENDING_PAYMENT',
        items: [],
        totalPrice,
        createdAt: new Date().toISOString(),
      };
      qc.setQueriesData({ queryKey: ORDERS_QUERY_KEY }, (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return [tempOrder, ...old];
      });
      return { previous, tempId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        ctx.previous.forEach(([key, data]) => qc.setQueryData(key, data));
      }
    },
    onSuccess: (realOrder, _vars, ctx) => {
      // 用真实订单替换临时订单
      qc.setQueriesData({ queryKey: ORDERS_QUERY_KEY }, (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.map((o: Order) => (o.id === ctx?.tempId ? realOrder : o));
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ORDERS_QUERY_KEY }),
  });
}

// ============================================================================
// 替换品批1（2026-10-29 D5/D8/D1）：替换建议决策 mutation
// Why: 详情页确认弹层双按钮共用；成功后 invalidate 本单 + 列表（金额/快照已原地改写）
// ============================================================================
export function useDecideSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      itemId,
      input,
    }: {
      orderId: string;
      itemId: string;
      input: { accept: boolean; replacementItemId?: string };
    }) => orderApi.decideSuggestion(orderId, itemId, input),
    onSettled: (_data, _err, vars) => {
      void qc.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      if (vars?.orderId) {
        void qc.invalidateQueries({ queryKey: orderDetailKey(vars.orderId) });
      }
    },
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orderApi.cancelOrder(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ORDERS_QUERY_KEY });
      const previous = qc.getQueriesData({ queryKey: ORDERS_QUERY_KEY });
      qc.setQueriesData({ queryKey: ORDERS_QUERY_KEY }, (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.map((o: Order) => (o.id === id ? { ...o, status: 'CANCELLED' as const } : o));
      });
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        ctx.previous.forEach(([key, data]) => qc.setQueryData(key, data));
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ORDERS_QUERY_KEY }),
  });
}

// ============================================================================
// 批3（#5 订单删除）：删除订单（单条/批量）——乐观移除 + counts 按状态组递减
// ============================================================================

// Why: counts queryKey（[...ORDERS_QUERY_KEY,'counts']）是聚合数无列表可 filter，
//      乐观更新按被删订单状态对 counts（OrderStatus 键）手动 -1，组角标由 useOrderCounts 聚合层自然联动；
//      列表（all + 各 status 变体 + infinite 各 tab）走前缀 setQueriesData 数组过滤。
//      回滚复用 getQueriesData 快照（useCreateOrder 同款基建）。单条/批量统一 ids 入参（单条=长度 1）。
export function useDeleteOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => orderApi.deleteOrders(ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: ORDERS_QUERY_KEY });
      const previous = qc.getQueriesData({ queryKey: ORDERS_QUERY_KEY });
      const set = new Set(ids);
      // 收集被删订单的状态（列表缓存各变体里取，取不到的 id 跳过 counts 递减）
      const deletedByStatus = new Map<OrderStatus, number>();
      qc.setQueriesData({ queryKey: ORDERS_QUERY_KEY }, (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return (old as Order[]).filter((o) => {
          if (set.has(o.id)) {
            deletedByStatus.set(o.status, (deletedByStatus.get(o.status) ?? 0) + 1);
            return false;
          }
          return true;
        });
      });
      // counts 乐观递减：counts 以 OrderStatus 为键（useOrderCounts 按 ORDER_STATUS_GROUPS
      // 聚合成组角标），按被删订单的状态逐条 -1
      const countsKey = ORDERS_COUNTS_KEY;
      const rawCounts = qc.getQueryData<Record<string, number>>(countsKey);
      if (rawCounts) {
        const next = { ...rawCounts };
        for (const [status, n] of deletedByStatus) {
          next[status] = Math.max(0, (next[status] ?? 0) - n);
        }
        qc.setQueryData(countsKey, next);
      }
      return { previous };
    },
    onError: (_err, _ids, ctx) => {
      if (ctx?.previous) {
        ctx.previous.forEach(([key, data]) => qc.setQueryData(key, data));
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ORDERS_QUERY_KEY }),
  });
}
