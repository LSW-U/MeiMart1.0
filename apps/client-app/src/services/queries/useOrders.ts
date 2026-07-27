import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '@/services/orders';
import { useAuthStore } from '@/store/authStore';
import type { OrderStatus, Order } from '@/types';

export const ORDERS_QUERY_KEY = ['orders'] as const;

const ORDERS_PAGE_SIZE = 20;

// Why: 兼容不依赖分页的旧组件（如 checkout.tsx），返回 Order[]，单页 limit=20
export function useOrders(status?: OrderStatus | 'all') {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [...ORDERS_QUERY_KEY, status ?? 'all'],
    queryFn: async () => {
      const res = await orderApi.getOrders(status);
      return res.items;
    },
    staleTime: 60 * 1000,
    networkMode: 'offlineFirst',
    enabled: isAuthenticated, // 未登录时不请求
  });
}

// P2 §4.1: 个人中心 4 宫格订单计数 - 从 useOrders('all') 派生（auth 自动 gating）
// Why: 方案 §4.1 称「useOrders 不存在」有误，实际已存在；这里薄封装按状态集归并 4 个宫格
// 业务映射（基于 legacyStatusMap 后的新 enum；mock 5 单覆盖 4 态各 1）：
//   to-pay 待付款 = PENDING_PAYMENT
//   to-ship 待发货 = PENDING_CONFIRM + CONFIRMED（已付款待发货）
//   to-receive 待收货 = PICKED + OUT_FOR_DELIVERY（已发货在途）
//   review 待评价 = DELIVERED + COMPLETED（已收货可评价）
// Caveat: real 模式 useOrders 单页 limit=20，订单超 20 时计数会偏低；后端订单计数接口就绪后替换。
const ORDER_COUNT_MAP: Record<string, OrderStatus[]> = {
  'to-pay': ['PENDING_PAYMENT'],
  'to-ship': ['PENDING_CONFIRM', 'CONFIRMED'],
  'to-receive': ['PICKED', 'OUT_FOR_DELIVERY'],
  review: ['DELIVERED', 'COMPLETED'],
};

export function useOrderCounts(): Record<string, number> {
  const { data } = useOrders('all');
  const orders = data ?? [];
  const counts: Record<string, number> = {};
  for (const [cell, statuses] of Object.entries(ORDER_COUNT_MAP)) {
    counts[cell] = orders.filter((o) => statuses.includes(o.status)).length;
  }
  return counts;
}

// Why: 游标分页无限加载 hook，订单列表页用。消费 service 的 nextCursor + hasMore。
export function useOrdersInfinite(status?: OrderStatus | 'all') {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useInfiniteQuery({
    queryKey: [...ORDERS_QUERY_KEY, 'infinite', status ?? 'all'],
    queryFn: ({ pageParam }) => orderApi.getOrders(status, pageParam, ORDERS_PAGE_SIZE),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    staleTime: 60 * 1000,
    networkMode: 'offlineFirst',
    enabled: isAuthenticated, // 未登录时不请求
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['order', id],
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
