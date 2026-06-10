import type { EarningSummary, EarningTransaction } from '@/src/types/earnings';

export function useEarningsStore() {
  return {
    summary: null as EarningSummary | null,
    transactions: [] as EarningTransaction[],
    setSummary: (_summary: EarningSummary | null) => undefined,
    setTransactions: (_transactions: EarningTransaction[]) => undefined,
  };
}
