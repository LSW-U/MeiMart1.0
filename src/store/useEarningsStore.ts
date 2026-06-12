import { create } from 'zustand';

import type { EarningSummary, EarningTransaction } from '../types/earnings';
import { getEarningSummary, getEarningTransactions, subscribeEarningSummary, subscribeEarningTransactions } from '../services/earnings';

type EarningsState = {
  summary: EarningSummary | null;
  transactions: EarningTransaction[];
  hydrated: boolean;
  hydrate: () => Promise<() => void>;
};

export const useEarningsStore = create<EarningsState>((set) => ({
  summary: null,
  transactions: [],
  hydrated: false,

  hydrate: async () => {
    const [summary, transactions] = await Promise.all([
      getEarningSummary(),
      getEarningTransactions(),
    ]);
    set({ summary, transactions, hydrated: true });

    const unsubSummary = subscribeEarningSummary((s) => set({ summary: s }));
    const unsubTx = subscribeEarningTransactions((txs) => set({ transactions: txs }));
    return () => { unsubSummary(); unsubTx(); };
  },
}));
