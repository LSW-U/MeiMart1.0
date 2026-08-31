import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '@/services/orders';
import { useAuthStore } from '@/store/authStore';
import { useLocale } from '@/i18n';
import {
  ORDER_STATUS_GROUPS,
  tabStatuses,
  type OrderGroupKey,
  type OrderTabKey,
} from '@/lib/orderStatusConfig';
import type { OrderStatus, Order } from '@/types';

export const ORDERS_QUERY_KEY = ['orders'] as const;

const ORDERS_PAGE_SIZE = 20;

// Why: 订单商品名在 service 层 pickLocalized 按语言烘焙（transformOrderItem），
//      key 不含 locale 时切语言后 60s staleTime 内订单列表一直旧语言（同 categories 缓存 bug）。
//      locale 入 key → 切语言即视为新查询重查；乐观更新走前缀 setQueriesData 天然兼容。
export const ordersListKey = (locale: string, status: OrderStatus[] | 'all') =>
  [...ORDERS_QUERY_KEY, locale, status ?? 'all'] as const;

export const orderInfiniteKey = (locale: string, tab: OrderTabKey) =>
  [...ORDERS_QUERY_KEY, 'infinite', locale, tab] as const;

// Why: 详情 key 必须落在 ORDERS_QUERY_KEY 前缀下（审查报告 20260901 F1）——useCreateOrder/
//      useCancelOrder 的 onSettled 只 invalidate ['orders'] 前缀，原 ['order', locale, id] 根是
//      单数不在前缀内，取消订单后已打开的详情页不失效（预存在 bug，本次连根修）。
//      挪入前缀后 onMutate 的 setQueriesData 也会前缀命中详情条目，但回调有 Array.isArray
//      守卫（详情是单对象非数组）原样返回，安全。
export const orderDetailKey = (locale: string, id: string) =>
  [...ORDERS_QUERY_KEY, 'detail', locale, id] as const;

// Why: 兼容不依赖分页的旧组件（如 useOrderCounts 派生计数），返回 Order[]，单页 limit=20。
// P12 Commit 2: status 改成 OrderStatus[]（支持多状态过滤），'all' 表示不过滤。
export function useOrders(status?: OrderStatus[] | 'all') {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const locale = useLocale();
  return useQuery({
    queryKey: ordersListKey(locale, status ?? 'all'),
    queryFn: async () => {
      const res = await orderApi.getOrders(status);
      return res.items;
    },
    staleTime: 60 * 1000,
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
    queryKey: [...ORDERS_QUERY_KEY, 'counts'],
    queryFn: () => orderApi.getOrderCounts(),
    staleTime: 60 * 1000,
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
  const locale = useLocale();
  const statuses = tabStatuses(tab);
  return useInfiniteQuery({
    queryKey: orderInfiniteKey(locale, tab),
    queryFn: ({ pageParam }) => orderApi.getOrders(statuses, pageParam, ORDERS_PAGE_SIZE),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    staleTime: 60 * 1000,
    networkMode: 'offlineFirst',
    enabled: isAuthenticated, // 未登录时不请求
  });
}

export function useOrder(id: string | undefined) {
  const locale = useLocale();
  return useQuery({
    queryKey: orderDetailKey(locale, id ?? ''),
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
