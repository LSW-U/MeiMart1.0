/**
 * 批1 T6（D5/N4/N5）：earningsApi 真实接线测试——
 *   ① 路径 /rider/earnings/summary、/rider/earnings/transactions（原 /earnings/* 是错路径）
 *   ② 分→美元 /100 适配（today→todayEarnings 字段映射）
 *   ③ 流水 status 收敛（未知值 → PENDING 不崩渲染；DISPUTED 透传）
 *   ④ createWithdrawal：amount 美元 ×100 转分 + payoutAccount 拼装（选填字段空则不带）
 * mock 层走 isMockMode=false 强制 real 分支。
 */
import { api } from '../api';
import { earningsApi } from '../earnings';

jest.mock('../api', () => ({
  isMockMode: false,
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));
jest.mock('../notification', () => ({ notificationApi: { add: jest.fn() } }));
jest.mock('../settings', () => ({
  riderSettingsApi: { get: jest.fn() },
  // LanguageContext 模块加载期调用 getCurrentLanguage()，桩一个静态缺省
  getCurrentLanguage: () => 'zh',
  ensureSettingsHydrated: () => Promise.resolve(),
}));
jest.mock('../../i18n/useTranslation', () => ({
  translate: () => '$',
}));

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;

describe('earningsApi 真实接线（批1 T6）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    it('GET /rider/earnings/summary + 分→美元 + today→todayEarnings 映射', async () => {
      mockGet.mockResolvedValueOnce({
        data: { availableBalance: 12850, today: 2450, weekly: 18600, monthly: 72000 },
      });

      const res = await earningsApi.getSummary();

      expect(mockGet).toHaveBeenCalledWith('/rider/earnings/summary');
      expect(res).toEqual({
        availableBalance: 128.5,
        todayEarnings: 24.5,
        weeklyEarnings: 186,
        monthlyEarnings: 720,
      });
    });
  });

  describe('getTransactions', () => {
    it('GET /rider/earnings/transactions + netAmount→amount（分→美元）+ 按 createdAt 降序', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 's1',
              periodDate: '2026-10-03',
              orderCount: 8,
              grossAmount: 5000,
              commission: 500,
              refundAmount: 0,
              netAmount: 4500,
              status: 'PAID',
              confirmedAt: null,
              paidAt: null,
              createdAt: '2026-10-03T10:00:00Z',
            },
            {
              id: 's2',
              periodDate: '2026-10-04',
              orderCount: 5,
              grossAmount: 3000,
              commission: 300,
              refundAmount: 0,
              netAmount: 2700,
              status: 'PENDING',
              confirmedAt: null,
              paidAt: null,
              createdAt: '2026-10-04T10:00:00Z',
            },
          ],
        },
      });

      const res = await earningsApi.getTransactions();

      expect(mockGet).toHaveBeenCalledWith('/rider/earnings/transactions');
      expect(res[0]?.id).toBe('s2');
      expect(res[0]?.amount).toBe(27);
      expect(res[1]?.id).toBe('s1');
      expect(res[1]?.amount).toBe(45);
    });

    it('status 收敛：DISPUTED 透传，未知值按 PENDING 兜底', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 'a',
              periodDate: 'd',
              orderCount: 1,
              grossAmount: 1,
              commission: 0,
              refundAmount: 0,
              netAmount: 1,
              status: 'DISPUTED',
              confirmedAt: null,
              paidAt: null,
              createdAt: '2026-10-01T00:00:00Z',
            },
            {
              id: 'b',
              periodDate: 'd',
              orderCount: 1,
              grossAmount: 1,
              commission: 0,
              refundAmount: 0,
              netAmount: 1,
              status: 'WEIRD',
              confirmedAt: null,
              paidAt: null,
              createdAt: '2026-10-02T00:00:00Z',
            },
          ],
        },
      });

      const res = await earningsApi.getTransactions();

      const byId = new Map(res.map((tx) => [tx.id, tx]));
      expect(byId.get('a')?.status).toBe('DISPUTED');
      expect(byId.get('b')?.status).toBe('PENDING');
    });
  });

  describe('createWithdrawal', () => {
    it('POST /rider/withdrawals：amount ×100 转分 + payoutAccount 四字段齐全', async () => {
      mockPost.mockResolvedValueOnce({ data: { id: 'w1' } });

      await earningsApi.createWithdrawal({
        amount: 12.5,
        channel: 'BANK_TRANSFER',
        account: 'TL 123',
        holderName: 'João',
        bankName: 'BNCTL',
        branchName: 'Dili',
      });

      expect(mockPost).toHaveBeenCalledWith('/rider/withdrawals', {
        amount: 1250,
        payoutAccount: {
          channel: 'BANK_TRANSFER',
          account: 'TL 123',
          holderName: 'João',
          bankName: 'BNCTL',
          branchName: 'Dili',
        },
      });
    });

    it('选填字段空则不带（payoutAccount 只含 channel+account）', async () => {
      mockPost.mockResolvedValueOnce({ data: { id: 'w2' } });

      await earningsApi.createWithdrawal({
        amount: 5,
        channel: 'WECHAT',
        account: 'wx-id',
      });

      expect(mockPost).toHaveBeenCalledWith('/rider/withdrawals', {
        amount: 500,
        payoutAccount: { channel: 'WECHAT', account: 'wx-id' },
      });
      expect(mockPost.mock.calls[0]?.[1]?.payoutAccount).not.toHaveProperty('holderName');
      expect(mockPost.mock.calls[0]?.[1]?.payoutAccount).not.toHaveProperty('bankName');
      expect(mockPost.mock.calls[0]?.[1]?.payoutAccount).not.toHaveProperty('branchName');
    });
  });
});
