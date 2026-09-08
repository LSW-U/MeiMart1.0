import axios from 'axios';
import { api, isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import type { PaymentMethod, LocalizableText } from '@/types';

// Why: 批B 支付枚举补位（微信支付预留 2026-09-08）— 后端 GET /client/payments/methods 已就位，
// getMethods 切真实端点；icon 值是后端短 code（cod/bank/wechat/...），映射到 Material Symbols
// 名再走 <Icon symbol>（与 mock 数据 icon 同一套 symbolToMc 查表），dev(mock)/prod(real) 渲染一致。
const ICON_SYMBOL_BY_CODE: Record<string, string> = {
  cod: 'payments',
  bank: 'account_balance',
  wechat: 'wechat',
  paypal: 'paypal',
  stripe: 'credit_card',
  'wechat-global': 'wechat',
  alipay: 'account_balance_wallet',
  'local-psp': 'storefront',
};

/** 后端 PaymentMethodItem 视图（契约 schemas/payment.ts） */
interface PaymentMethodApiItem {
  code: string;
  name: Record<string, string>;
  subtitle: Record<string, string>;
  icon: string;
  isDefault: boolean;
  enabled: boolean;
  available: boolean;
  mockFlag: boolean;
}

// Why: 后端多语言 JSON 是 5 语（en/zh/id/pt/tet），前端 LocalizableText 是 4 语（zh/en/tet/pt），
// 收敛键集避免 'id' 键泄漏进 UI 层；缺键回退空串（localizer 会再 fallback en）
function toLocalizable(record: Record<string, string>): LocalizableText {
  return {
    en: record.en ?? '',
    zh: record.zh ?? '',
    tet: record.tet ?? '',
    pt: record.pt ?? '',
  };
}

function toUiMethod(item: PaymentMethodApiItem): PaymentMethod {
  return {
    id: item.code,
    code: item.code,
    name: toLocalizable(item.name),
    subtitle: toLocalizable(item.subtitle),
    icon: ICON_SYMBOL_BY_CODE[item.icon] ?? 'credit_card',
    isDefault: item.isDefault,
    enabled: item.enabled,
    available: item.available,
    mockFlag: item.mockFlag,
  };
}

export const paymentApi = {
  async getMethods(): Promise<PaymentMethod[]> {
    if (isMockMode) return mockResponse(mockDb.payments as PaymentMethod[]);
    // Why: 后端统一响应 { success, data } 壳由 api 拦截器剥掉，res.data 即 { items }
    const res = await api.get<{ items: PaymentMethodApiItem[] }>('/client/payments/methods');
    return res.data.items.map(toUiMethod);
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
  // #004 守卫（批次2）：后端有 prod 拒绝兜底，但前端也拦——避免 prod 构建里发出注定失败的请求
  async mockPay(orderId: string): Promise<{ orderId: string; intentId: string }> {
    if (!__DEV__) throw new Error('mockPay is dev-only');
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

  // Why: COD 订单确认（货到付款无需预付，商家接单即确认）。
  // 后端 POST /admin/orders/{id}/confirm 需 admin token，客户端无 admin 权限，
  // 开发环境用 mock-login 获取 admin token 调用。prod 应由 admin web 确认。
  // #001 守卫（批次2）：mock-login 是 dev-only 端点，prod 调它要么 404 要么泄露调用意图
  async adminConfirmOrder(orderId: string): Promise<void> {
    if (!__DEV__) throw new Error('adminConfirmOrder is dev-only');
    if (isMockMode) return;
    const baseURL = api.defaults.baseURL ?? '';
    // Why: 独立 axios 请求避免 client api 拦截器注入 customer token
    // 后端 mock-login 要求 role 大写
    const loginRes = await axios.post(`${baseURL}/common/auth/mock-login`, {
      role: 'SUPER_ADMIN',
      deviceType: 'admin_web',
    });
    const adminToken = loginRes.data?.data?.accessToken;
    if (!adminToken) throw new Error('Failed to get admin token for COD confirm');
    await axios.post(
      `${baseURL}/admin/orders/${orderId}/confirm`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
  },

  // Why: 开发环境下单后自动确认订单，让骑手端能看到任务。
  // COD -> admin 确认；WECHAT/PAYPAL/STRIPE -> 模拟支付 + 确认。
  // 仅 __DEV__ 调用，prod 走真实流程（COD 由 admin web 确认，预付走支付）。
  async devAutoConfirm(orderId: string, paymentMethod: string): Promise<void> {
    if (isMockMode) return;
    const prepayMethods = ['WECHAT', 'PAYPAL', 'STRIPE'];
    if (paymentMethod === 'COD') {
      await this.adminConfirmOrder(orderId);
    } else if (prepayMethods.includes(paymentMethod)) {
      await this.mockPay(orderId);
      await this.confirm(orderId);
    }
    // BANK_TRANSFER 等其他方式不自动确认（需人工处理）
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
