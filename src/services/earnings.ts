import type { EarningSummary, EarningTransaction, WithdrawalRequest } from '@/src/types/earnings';

export async function getEarningSummary(): Promise<EarningSummary> {
  return {
    availableBalance: 0,
    todayEarnings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
  };
}

export async function getEarningTransactions(): Promise<EarningTransaction[]> {
  return [];
}

export async function createWithdrawal(_amount: number, _method: WithdrawalRequest['method']) {
  return undefined;
}
