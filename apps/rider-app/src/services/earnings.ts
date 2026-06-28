import type { EarningSummary, EarningTransaction, WithdrawalRequest } from '@/src/types/earnings';

import { api, isMockMode } from './api';
import { notificationApi } from './notification';

// 后端无 rider earnings / withdraw 端点（W6+ 才实现），real 模式也强制走 mock。
// W6+ 后端实现时把 FORCE_MOCK 改为 false 即可启用真实分支。
const FORCE_MOCK = true;

// ── Mock layer (localStorage for Web dev) ──────────────────────────

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

let mockSummary: EarningSummary | null = null;
let mockTransactions: EarningTransaction[] | null = null;

function getMockSummary(): EarningSummary {
  if (mockSummary) return mockSummary;
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(storageKey + ':summary');
    if (stored) {
      mockSummary = JSON.parse(stored) as EarningSummary;
      return mockSummary;
    }
  }
  mockSummary = { ...defaultSummary };
  saveMockSummary();
  return mockSummary;
}

function saveMockSummary(): void {
  if (typeof localStorage !== 'undefined' && mockSummary) {
    localStorage.setItem(storageKey + ':summary', JSON.stringify(mockSummary));
  }
}

function getMockTransactions(): EarningTransaction[] {
  if (mockTransactions) return mockTransactions;
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(storageKey + ':transactions');
    if (stored) {
      mockTransactions = JSON.parse(stored) as EarningTransaction[];
      return mockTransactions;
    }
  }
  mockTransactions = seedTransactions.slice();
  saveMockTransactions();
  return mockTransactions;
}

function saveMockTransactions(): void {
  if (typeof localStorage !== 'undefined' && mockTransactions) {
    localStorage.setItem(storageKey + ':transactions', JSON.stringify(mockTransactions));
  }
}

function mockDelay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ── earningsApi 对象 ────────────────────────────────────────────────

export const earningsApi = {
  async getSummary(): Promise<EarningSummary> {
    if (isMockMode || FORCE_MOCK) return mockDelay({ ...getMockSummary() });
    const res = await api.get<EarningSummary>('/earnings/summary');
    return res.data;
  },

  async getTransactions(): Promise<EarningTransaction[]> {
    if (isMockMode || FORCE_MOCK) {
      const items = getMockTransactions().slice();
      return mockDelay(
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      );
    }
    const res = await api.get<EarningTransaction[]>('/earnings/transactions');
    return res.data;
  },

  async createWithdrawal(amount: number, method: WithdrawalRequest['method']): Promise<void> {
    if (isMockMode || FORCE_MOCK) {
      const s = getMockSummary();
      if (amount > s.availableBalance) {
        throw new Error('Insufficient balance');
      }
      s.availableBalance = Math.round((s.availableBalance - amount) * 100) / 100;
      saveMockSummary();

      const tx: EarningTransaction = {
        id: generateId(),
        amount: -amount,
        type: 'withdrawal',
        createdAt: new Date().toISOString(),
        description: method === 'bank' ? 'Withdrawal to bank' : 'Cash pickup',
      };
      getMockTransactions().unshift(tx);
      saveMockTransactions();

      await notificationApi.add({
        category: 'wallet',
        titleKey: 'notification.template.walletWithdrawSuccess.title',
        messageKey: 'notification.template.walletWithdrawSuccess.message',
        vars: { amount: `$${amount.toFixed(2)}` },
        link: '/(main)/earnings',
      });
      return;
    }
    // 后端只有 /admin/settle/withdrawals（super_admin 代录），骑手端不可用
    throw new Error('rider withdraw endpoint not available (W6+)');
  },
};
