import { useQuery } from '@tanstack/react-query';
import { paymentApi } from '@/services/payment';
import type { PaymentMethod } from '@/types';

export const PAYMENTS_QUERY_KEY = ['payments', 'methods'] as const;

/**
 * 拉取可用支付方式列表（结算页用）。
 *
 * 后端契约：见 src/services/payment.ts
 */
export function usePaymentMethods() {
  return useQuery({
    queryKey: PAYMENTS_QUERY_KEY,
    queryFn: () => paymentApi.getMethods(),
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}

export type { PaymentMethod };
