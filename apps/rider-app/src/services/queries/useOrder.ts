import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { OrderHistoryItem } from '@/src/types/order';

import { orderApi } from '../order';
import { useAuthStore } from '../../store/useAuthStore';

export const orderHistoryKey = ['orders', 'history'] as const;
export const orderStatusCountsKey = ['orders', 'statusCounts'] as const;
export const orderTodayStatsKey = ['orders', 'todayStats'] as const;

export function orderDetailKey(id: string) {
  return ['orders', 'detail', id] as const;
}

// C5（R-P2-5）：三个 order 系 query 补鉴权 gate（同目录 useRider/useSettings/useDeposit 先例）。
// Why：未登录时 queryFn 空跑必 401（token 无效），console 报错 + 缓存塞错误态。
export function useOrderHistory() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: orderHistoryKey,
    queryFn: () => orderApi.getHistory(),
    enabled: isAuthenticated,
  });
}

export function useOrderStatusCounts() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: orderStatusCountsKey,
    queryFn: () => orderApi.countByStatus(),
    enabled: isAuthenticated,
  });
}

export function useOrderTodayStats() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: orderTodayStatsKey,
    queryFn: () => orderApi.getTodayStats(),
    enabled: isAuthenticated,
  });
}

export function useOrder(id: string | undefined) {
  // 补 isAuthenticated gate（同文件另 3 个 order 系 query 对齐）：未登录深链 detail 页
  // 时 queryFn 空跑必 401，触发全局 401 误登出。
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: id ? orderDetailKey(id) : ['orders', 'detail', 'none'],
    queryFn: () => orderApi.getById(id as string),
    enabled: Boolean(id) && isAuthenticated,
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
