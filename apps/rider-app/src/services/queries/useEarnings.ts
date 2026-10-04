import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { WithdrawalSubmit } from '@/src/types/earnings';

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

// 批1 T6（D10）：提现入参改 WithdrawalSubmit（amount 美元 + payout channel + account），
// service 层负责 ×100 转分与 payoutAccount 拼装
export function useCreateWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: WithdrawalSubmit) => earningsApi.createWithdrawal(params),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: earningsSummaryKey });
      void queryClient.invalidateQueries({ queryKey: earningsTransactionsKey });
    },
  });
}
