import type {
  EarningSummary,
  EarningTransaction,
  EarningTxStatus,
  WithdrawalSubmit,
} from '@/src/types/earnings';

import { isMockMode, api } from './api';
import { notificationApi } from './notification';
import { riderSettingsApi } from './settings';
import { translate } from '../i18n/useTranslation';
import { formatCurrency } from '../utils/format';

// 批1 T6（D5/N4）：后端 W6+ earnings/withdrawals 端点已就绪（MeiMart ccaa26b），
// 撤 FORCE_MOCK——real 模式走真实端点（适配层见下），mock 模式（本地开发）保留原 localStorage 层。
// 第四轮批4：isEarningsForcedMock 导出已删（FORCE_MOCK=false 恒 false，页面占位分支
// 已退役且全仓零调用方，grep 已核；退役断言测试同步删除）。
const FORCE_MOCK = false;

// ── 后端原始结构（契约 @meimart/api-contract rider-earnings.ts，金额单位：分）──

interface RiderEarningsSummaryRaw {
  availableBalance: number; // 分
  today: number; // 分
  weekly: number; // 分
  monthly: number; // 分
}

interface RiderEarningsTransactionRaw {
  id: string;
  periodDate: string;
  orderCount: number;
  grossAmount: number; // 分
  commission: number; // 分
  refundAmount: number; // 分
  netAmount: number; // 分
  status: string; // PENDING/CONFIRMED/PAID/DISPUTED
  confirmedAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

// ── 适配层（D5：字段映射 + 分→美元 /100 集中在此，页面格式化沿用本地 formatCurrency）──

const CENTS_PER_DOLLAR = 100;

/** 分 → 美元（保留 2 位小数误差安全：金额整数分，/100 天然 2 位精度） */
function centsToUsd(cents: number): number {
  return cents / CENTS_PER_DOLLAR;
}

function adaptSummary(raw: RiderEarningsSummaryRaw): EarningSummary {
  // 字段映射 today→todayEarnings（D5）：映射集中 earnings service 一处
  return {
    availableBalance: centsToUsd(raw.availableBalance),
    todayEarnings: centsToUsd(raw.today),
    weeklyEarnings: centsToUsd(raw.weekly),
    monthlyEarnings: centsToUsd(raw.monthly),
  };
}

/** 后端 status 收敛到前端四枚举（未知值按 PENDING 处理不崩渲染） */
function adaptTxStatus(status: string): EarningTxStatus {
  if (status === 'CONFIRMED' || status === 'PAID' || status === 'DISPUTED') return status;
  return 'PENDING';
}

function adaptTransaction(raw: RiderEarningsTransactionRaw): EarningTransaction {
  return {
    id: raw.id,
    // 流水行按结算周期聚合（无单号概念），description 用 periodDate 供页面 i18n 描述
    amount: centsToUsd(raw.netAmount),
    type: 'deliveryFee',
    status: adaptTxStatus(raw.status),
    createdAt: raw.createdAt,
    description: raw.periodDate,
  };
}

// ── Mock layer (localStorage for Web dev) ──────────────────────────

const storageKey = 'mei-delivery-app:earnings:v1';

const defaultSummary: EarningSummary = {
  availableBalance: 128.5,
  todayEarnings: 24.5,
  weeklyEarnings: 186.0,
  monthlyEarnings: 720.0,
};

const seedTransactions: EarningTransaction[] = [
  {
    id: 'tx-1',
    orderId: '1023',
    amount: 12.5,
    type: 'deliveryFee',
    status: 'PAID',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    description: 'Delivery #1023',
  },
  {
    id: 'tx-2',
    amount: -10.0,
    type: 'withdrawal',
    status: 'PAID',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    description: 'Withdrawal to bank',
  },
  {
    id: 'tx-3',
    orderId: '1021',
    amount: 8.2,
    type: 'deliveryFee',
    status: 'CONFIRMED',
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    description: 'Delivery #1021',
  },
  {
    id: 'tx-4',
    orderId: '1019',
    amount: 4.0,
    type: 'bonus',
    status: 'PAID',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'First order bonus',
  },
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
    // 批1 T6（N4）：真实路径 /rider/earnings/summary（原 /earnings/summary 是错路径）
    const res = await api.get<RiderEarningsSummaryRaw>('/rider/earnings/summary');
    return adaptSummary(res.data);
  },

  async getTransactions(): Promise<EarningTransaction[]> {
    if (isMockMode || FORCE_MOCK) {
      const items = getMockTransactions().slice();
      return mockDelay(
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      );
    }
    // 批1 T6（N4）：真实路径 /rider/earnings/transactions + netAmount→amount 适配
    // （审查 P3-4：响应缺 items 按契约破坏上抛，不静默空列表——与 T1 撤兜底同口径）
    const res = await api.get<{ items: RiderEarningsTransactionRaw[] }>(
      '/rider/earnings/transactions',
    );
    const items = res.data.items.map(adaptTransaction);
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createWithdrawal(input: WithdrawalSubmit): Promise<void> {
    if (isMockMode || FORCE_MOCK) {
      const s = getMockSummary();
      if (input.amount > s.availableBalance) {
        throw new Error('Insufficient balance');
      }
      s.availableBalance = Math.round((s.availableBalance - input.amount) * 100) / 100;
      saveMockSummary();

      const tx: EarningTransaction = {
        id: generateId(),
        amount: -input.amount,
        type: 'withdrawal',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        description: 'Withdrawal',
      };
      getMockTransactions().unshift(tx);
      saveMockTransactions();

      await notificationApi.add({
        category: 'wallet',
        titleKey: 'notification.template.walletWithdrawSuccess.title',
        messageKey: 'notification.template.walletWithdrawSuccess.message',
        // A4：金额走 formatCurrency + 当前语言货币符号（原 `$${amount.toFixed(2)}` 硬编码 $）。
        // 货币符号由 i18n common.currency 提供（5 语言统一 $，对齐 USD 官方货币）。
        vars: {
          amount: formatCurrency(
            input.amount,
            translate((await riderSettingsApi.get()).language, 'common.currency'),
          ),
        },
        link: '/(main)/earnings',
      });
      return;
    }
    // 批1 T6（N5/D10）：POST /rider/withdrawals，amount 美元×100 转分（换算集中在适配层），
    // payoutAccount 按 PayoutAccount 契约拼装（channel 枚举四选一，account 必填）。
    try {
      await api.post('/rider/withdrawals', {
        amount: Math.round(input.amount * CENTS_PER_DOLLAR),
        payoutAccount: {
          channel: input.channel,
          account: input.account,
          ...(input.holderName ? { holderName: input.holderName } : {}),
          ...(input.bankName ? { bankName: input.bankName } : {}),
          ...(input.branchName ? { branchName: input.branchName } : {}),
        },
      });
    } catch (e: unknown) {
      // E-SETTLE-001 余额不足：rider api throwApiError=true 抛 ApiError(status, code, message)，
      // 透传原始 code 供页面映射提示（withdraw 页 resolveErrorMessage 按 code 判断）。
      throw e;
    }
  },
};
