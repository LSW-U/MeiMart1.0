import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '@/services/orders';
import type { OrderStatus, Order } from '@/types';

export const ORDERS_QUERY_KEY = ['orders'] as const;

// Why: service 层 getOrders 返回游标分页结构 {items, nextCursor, hasMore}，
// useOrders 保持返回 Order[] 兼容现有组件（不实现"加载更多"UI，单页 limit=20 足够）。
// 后续如需"加载更多"，再单独导出 useOrdersInfinite，不影响现有调用方。
export function useOrders(status?: OrderStatus | 'all') {
  return useQuery({
    queryKey: [...ORDERS_QUERY_KEY, status ?? 'all'],
    queryFn: async () => {
      const res = await orderApi.getOrders(status);
      return res.items;
    },
    staleTime: 60 * 1000,
    networkMode: 'offlineFirst',
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
