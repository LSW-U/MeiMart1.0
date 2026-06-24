import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { WithdrawalRequest } from '@/src/types/earnings';

import { earningsApi } from '../earnings';

export const earningsSummaryKey = ['earnings', 'summary'] as const;
export const earningsTransactionsKey = ['earnings', 'transactions'] as const;

export function useEarningSummary() {
  return useQuery({
    queryKey: earningsSummaryKey,
    queryFn: () => earningsApi.getSummary(),
  });
}

export function useEarningTransactions() {
  return useQuery({
    queryKey: earningsTransactionsKey,
    queryFn: () => earningsApi.getTransactions(),
  });
}

export function useCreateWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { amount: number; method: WithdrawalRequest['method'] }) =>
      earningsApi.createWithdrawal(params.amount, params.method),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: earningsSummaryKey });
      void queryClient.invalidateQueries({ queryKey: earningsTransactionsKey });
    },
  });
}
