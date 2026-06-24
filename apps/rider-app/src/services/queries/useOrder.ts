import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { OrderHistoryItem } from '@/src/types/order';

import { orderApi } from '../order';

export const orderHistoryKey = ['orders', 'history'] as const;
export const orderStatusCountsKey = ['orders', 'statusCounts'] as const;
export const orderTodayStatsKey = ['orders', 'todayStats'] as const;

export function orderDetailKey(id: string) {
  return ['orders', 'detail', id] as const;
}

export function useOrderHistory() {
  return useQuery({
    queryKey: orderHistoryKey,
    queryFn: () => orderApi.getHistory(),
  });
}

export function useOrderStatusCounts() {
  return useQuery({
    queryKey: orderStatusCountsKey,
    queryFn: () => orderApi.countByStatus(),
  });
}

export function useOrderTodayStats() {
  return useQuery({
    queryKey: orderTodayStatsKey,
    queryFn: () => orderApi.getTodayStats(),
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: id ? orderDetailKey(id) : ['orders', 'detail', 'none'],
    queryFn: () => orderApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useAddOrderHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: OrderHistoryItem) => orderApi.add(item),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: orderHistoryKey });
      void queryClient.invalidateQueries({ queryKey: orderStatusCountsKey });
      void queryClient.invalidateQueries({ queryKey: orderTodayStatsKey });
    },
  });
}
