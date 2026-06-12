import type { EarningSummary, EarningTransaction, WithdrawalRequest } from '../types/earnings';

import { API_BASE_URL, request } from './api';
import { addNotification } from './notification';

// ── Mock layer (localStorage) ──────────────────────────────────────

const storageKey = 'mei-delivery-app:earnings:v1';

const defaultSummary: EarningSummary = {
  availableBalance: 128.5,
  todayEarnings: 24.5,
  weeklyEarnings: 186.0,
  monthlyEarnings: 720.0,
};

const seedTransactions: EarningTransaction[] = [
  { id: 'tx-1', orderId: '1023', amount: 12.5, type: 'deliveryFee', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), description: 'Delivery #1023' },
  { id: 'tx-2', amount: -10.0, type: 'withdrawal', createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), description: 'Withdrawal to bank' },
  { id: 'tx-3', orderId: '1021', amount: 8.2, type: 'deliveryFee', createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), description: 'Delivery #1021' },
  { id: 'tx-4', orderId: '1019', amount: 4.0, type: 'bonus', createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), description: 'First order bonus' },
];

let summary: EarningSummary | null = null;
let transactions: EarningTransaction[] | null = null;
const summaryListeners = new Set<(s: EarningSummary) => void>();
const txListeners = new Set<(txs: EarningTransaction[]) => void>();

const getSummaryStore = (): EarningSummary => {
  if (summary) return summary;
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(storageKey + ':summary');
    if (stored) {
      summary = JSON.parse(stored) as EarningSummary;
      return summary;
    }
  }
  summary = { ...defaultSummary };
  saveSummary();
  return summary;
};

const saveSummary = () => {
  if (typeof localStorage !== 'undefined' && summary) {
    localStorage.setItem(storageKey + ':summary', JSON.stringify(summary));
  }
};

const notifySummary = () => {
  const snapshot = { ...getSummaryStore() };
  summaryListeners.forEach((l) => l(snapshot));
};

const getTxStore = (): EarningTransaction[] => {
  if (transactions) return transactions;
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(storageKey + ':transactions');
    if (stored) {
      transactions = JSON.parse(stored) as EarningTransaction[];
      return transactions;
    }
  }
  transactions = seedTransactions.slice();
  saveTransactions();
  return transactions;
};

const saveTransactions = () => {
  if (typeof localStorage !== 'undefined' && transactions) {
    localStorage.setItem(storageKey + ':transactions', JSON.stringify(transactions));
  }
};

const notifyTx = () => {
  const snapshot = getTxStore().slice();
  txListeners.forEach((l) => l(snapshot));
};

const generateId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ── Public API ─────────────────────────────────────────────────────

const isRemote = () => API_BASE_URL.length > 0;

export async function getEarningSummary(): Promise<EarningSummary> {
  if (isRemote()) {
    const remote = await request<EarningSummary>('/earnings/summary');
    summary = remote;
    saveSummary();
    notifySummary();
    return remote;
  }
  return { ...getSummaryStore() };
}

export async function getEarningTransactions(): Promise<EarningTransaction[]> {
  if (isRemote()) {
    const remote = await request<EarningTransaction[]>('/earnings/transactions');
    transactions = remote;
    saveTransactions();
    notifyTx();
    return remote;
  }
  return getTxStore().slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createWithdrawal(amount: number, method: WithdrawalRequest['method']) {
  if (isRemote()) {
    await request<void>('/earnings/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount, method }),
    });
    // Re-fetch to sync local cache
    await getEarningSummary();
    await getEarningTransactions();
    return;
  }

  const s = getSummaryStore();
  if (amount > s.availableBalance) {
    throw new Error('Insufficient balance');
  }

  s.availableBalance = Math.round((s.availableBalance - amount) * 100) / 100;
  saveSummary();
  notifySummary();

  const tx: EarningTransaction = {
    id: generateId(),
    amount: -amount,
    type: 'withdrawal',
    createdAt: new Date().toISOString(),
    description: method === 'bank' ? 'Withdrawal to bank' : 'Cash pickup',
  };
  getTxStore().unshift(tx);
  saveTransactions();
  notifyTx();

  await addNotification({
    category: 'wallet',
    titleKey: 'notification.template.walletWithdrawSuccess.title',
    messageKey: 'notification.template.walletWithdrawSuccess.message',
    vars: { amount: `$${amount.toFixed(2)}` },
    link: '/(main)/earnings',
  });
}

export function subscribeEarningSummary(listener: (s: EarningSummary) => void) {
  summaryListeners.add(listener);
  return () => { summaryListeners.delete(listener); };
}

export function subscribeEarningTransactions(listener: (txs: EarningTransaction[]) => void) {
  txListeners.add(listener);
  return () => { txListeners.delete(listener); };
}
