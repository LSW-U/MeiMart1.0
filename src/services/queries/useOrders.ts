import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '@/services/orders';
import type { OrderStatus, Order } from '@/types';

export const ORDERS_QUERY_KEY = ['orders'] as const;

export function useOrders(status?: OrderStatus | 'all') {
  return useQuery({
    queryKey: [...ORDERS_QUERY_KEY, status ?? 'all'],
    queryFn: () => orderApi.getOrders(status),
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

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ items, totalPrice }: { items: Order['items']; totalPrice: number }) =>
      orderApi.createOrder(items, totalPrice),
    onSuccess: () => qc.invalidateQueries({ queryKey: ORDERS_QUERY_KEY }),
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orderApi.cancelOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ORDERS_QUERY_KEY }),
  });
}
