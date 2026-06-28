import { api, isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import type { PaymentMethod } from '@/types';

// Why: 后端 PaymentIntent 字段扁平，前端 PaymentMethod 是 UI 卡片结构（icon/name/subtitle）。
// getMethods 暂保留 mock（后端无"列出支付方式"端点，方法集是写死的 5 种 COD/BANK/WECHAT/PAYPAL/STRIPE）。
export const paymentApi = {
  async getMethods(): Promise<PaymentMethod[]> {
    if (isMockMode) return mockResponse(mockDb.payments);
    // Why: 后端无 /payments/methods 端点，real 模式同样用 mock 数据（支付方式是前端固定 5 种）
    return mockResponse(mockDb.payments);
  },

  // Why: 支付端点 URL 参数是 orderId 不是 paymentId。后端没有"创建 payment"端点，
  // 下单时后端自动建 PaymentIntent，前端只查状态/模拟回调/确认。
  async getIntent(orderId: string): Promise<PaymentIntentView> {
    if (isMockMode) {
      return mockResponse({
        id: `pi-mock-${Date.now()}`,
        orderId,
        method: 'WECHAT',
        status: 'PENDING',
        amount: 0,
        transactionId: null,
        clientSecret: null,
        receiptUrl: null,
        mockFlag: true,
        paidAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    const res = await api.get<PaymentIntentView>(`/client/payments/${orderId}`);
    return res.data;
  },

  // Why: dev/staging 跳过真实支付流程的便利端点（仅 WECHAT/PAYPAL/STRIPE 可调，prod 后端拒绝）
  async mockPay(orderId: string): Promise<{ orderId: string; intentId: string }> {
    if (isMockMode) {
      return mockResponse({ orderId, intentId: `pi-mock-${Date.now()}` });
    }
    const res = await api.post<{ orderId: string; intentId: string }>(
      `/client/payments/${orderId}/mock-callback`,
    );
    return res.data;
  },

  // Why: 客户端轮询查到 PAID 后主动确认（仅预付场景），service 内部已校验 status=PAID 才调
  async confirm(orderId: string): Promise<{ orderId: string; status: 'CONFIRMED' }> {
    if (isMockMode) {
      return mockResponse({ orderId, status: 'CONFIRMED' });
    }
    const res = await api.post<{ orderId: string; status: 'CONFIRMED' }>(
      `/client/payments/${orderId}/confirm`,
    );
    return res.data;
  },
};

// Why: 后端 PaymentIntentView 结构，前端 usePayment 等查询时直接消费
export interface PaymentIntentView {
  id: string;
  orderId: string;
  method: string;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  amount: number;
  transactionId: string | null;
  clientSecret: string | null;
  receiptUrl: string | null;
  mockFlag: boolean;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}
