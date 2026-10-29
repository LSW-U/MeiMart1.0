import { useQuery } from '@tanstack/react-query';
import { paymentApi } from '@/services/payment';
import type { PaymentMethod } from '@/types';
import { STALE_TIME, PAYMENTS_QUERY_KEY } from '@/lib/queryKeys';

// key 定义集中迁 @/lib/queryKeys（批1 收编）；re-export 保持调用方 import 路径不变。
export { PAYMENTS_QUERY_KEY } from '@/lib/queryKeys';

/**
 * 拉取可用支付方式列表（结算页用）。
 *
 * 后端契约：见 src/services/payment.ts
 */
export function usePaymentMethods() {
  return useQuery({
    queryKey: PAYMENTS_QUERY_KEY,
    queryFn: () => paymentApi.getMethods(),
    staleTime: STALE_TIME.payments,
    networkMode: 'offlineFirst',
  });
}

export type { PaymentMethod };
