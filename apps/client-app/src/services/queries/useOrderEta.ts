import { useQuery } from '@tanstack/react-query';
import { orderApi } from '@/services/orders';
import type { OrderStatus } from '@/types';

// Why: 只有配送阶段（已拣货/配送中）才存在 DeliveryTask（含 estimatedArrival）。
//      CONFIRMED 及之前无 task，不查（避免无谓请求）。
const ETA_STATUSES: ReadonlySet<OrderStatus> = new Set(['PICKED', 'OUT_FOR_DELIVERY']);

/**
 * 订单详情页用的轻量 ETA hook：一次性 getTracking 取 task.estimatedArrival（静态值）。
 * 不挂 WebSocket、不轮询 —— 详情页只需一个 ETA 字符串，实时位置留给 tracking 页的 useOrderTracking。
 */
export function useOrderEta(orderId: string | undefined, status: OrderStatus) {
  const enabled = !!orderId && ETA_STATUSES.has(status);
  return useQuery({
    queryKey: ['order-eta', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const tracking = await orderApi.getTracking(orderId);
      return tracking.task?.estimatedArrival ?? null;
    },
    enabled,
    staleTime: 60 * 1000,
    networkMode: 'offlineFirst',
  });
}
