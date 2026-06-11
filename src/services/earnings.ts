import type { EarningSummary, EarningTransaction, WithdrawalRequest } from '@/src/types/earnings';

import { addNotification } from './notification';

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

export async function createWithdrawal(amount: number, _method: WithdrawalRequest['method']) {
  await addNotification({
    category: 'wallet',
    titleKey: 'notification.template.walletWithdrawSuccess.title',
    messageKey: 'notification.template.walletWithdrawSuccess.message',
    vars: { amount: `$${amount.toFixed(2)}` },
    link: '/(main)/earnings',
  });
}
