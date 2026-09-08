/**
 * 批B 支付枚举补位 — client 展示测试（微信支付预留 2026-09-08，方案V2 §3.2）
 *
 * 放 app 下 __tests__ 目录（括号子目录不被 jest testMatch 发现，见 order-detail-banner.test 注释）。
 *
 * 覆盖（任务书单测 ≥4）：
 * 1. 列表渲染（含占位渠道）：checkout 渲染 5 可选卡 + "即将上线"区 3 占位卡（不可选中、点击提示）
 * 2. ≈¥ 计算：formatCnyAmount 分→元
 * 3. zh 触发：WECHAT/WECHAT_GLOBAL/ALIPAY_CN + zh + 快照 → 显示
 * 4. 非 zh 不显示：其他 locale / 非人民币渠道 / 无快照 → 不显示
 * 5. result 页 ≈¥ 行渲染（zh + WECHAT + 快照）与不渲染分支
 * 6. paymentApi.getMethods real 模式 transform（8 项 + available 透传 + icon symbol 映射）
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import type { PaymentMethod } from '@/types';
import CheckoutPage from '../order/checkout';
import OrderResultScreen from '../order/result';
import { paymentApi } from '@/services/payment';
import { shouldShowCnyEstimate, formatCnyAmount } from '@/utils/cnyDisplay';

// ===== mocks =====
const mockApiGet = jest.fn();
const mockGetCurrentLocale = jest.fn(() => 'zh');
const mockToastInfo = jest.fn();
const mockUsePaymentMethods = jest.fn();

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}) as Record<string, string>,
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    // t 返回 key 本身，便于断言具体 key
    t: (key: string) => key,
    i18n: { language: 'zh' },
  }),
}));

// Why: result.tsx 的 ≈¥ 分支用 useLocale() 判定 locale=zh（P3-2 响应式化；checkout 只用 useLocalizer）
jest.mock('@/i18n', () => ({
  useLocalizer:
    () =>
    (text: unknown): string => {
      const record = text as { en?: string; zh?: string } | string;
      if (typeof record === 'string') return record;
      return record.en ?? record.zh ?? '';
    },
  useLocale: () => mockGetCurrentLocale(),
}));

jest.mock('@/hooks/useWeakNetworkUI', () => ({
  useWeakNetworkUI: () => ({ isOffline: false }),
}));

jest.mock('@/services/api', () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
  isMockMode: false,
}));

jest.mock('axios', () => ({ default: { post: jest.fn() } }));

jest.mock('@/services/mockDb', () => ({
  mockDb: { payments: [], orders: [] },
  mockResponse: async (value: unknown) => value,
}));

jest.mock('@/services/products', () => ({
  productApi: { getProduct: jest.fn() },
}));

jest.mock('@/store/toastStore', () => ({
  toast: {
    info: (...args: unknown[]) => mockToastInfo(...args),
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/services/queries/usePayment', () => ({
  usePaymentMethods: (...args: unknown[]) => mockUsePaymentMethods(...args),
}));

jest.mock('@/store/addressSelectionStore', () => ({
  useAddressSelectionStore: (selector: (s: unknown) => unknown) =>
    selector({ selectedId: undefined }),
  resolveCheckoutAddress: () => undefined,
}));

jest.mock('@/services/queries/usePromotion', () => ({
  useCoupons: () => ({ data: [] }),
}));

const mockUseOrder = jest.fn();

jest.mock('@/services/queries/useOrders', () => ({
  useCreateOrder: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useOrder: (...args: unknown[]) => mockUseOrder(...args),
  useCancelOrder: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/services/queries/useCart', () => ({
  useCart: () => ({ data: { items: [] }, isLoading: false, isError: false, refetch: jest.fn() }),
  useCheckoutPreview: () => ({ data: undefined }),
  useClearCart: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock('@/services/queries/useAddress', () => ({
  useAddresses: () => ({ data: [], isLoading: false, isError: false }),
}));

jest.mock('@/components/business/CouponPicker/CouponPicker', () => ({
  CouponPicker: () => null,
}));

jest.mock('@/components/cultural/TaisDivider', () => ({
  TaisDivider: () => null,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

// 8 渠道（5 可选 + 3 占位），name 4 语与 mocks/data/payments.json 同构
const makeMethods = (): PaymentMethod[] => [
  {
    id: 'COD',
    code: 'COD',
    icon: 'payments',
    isDefault: true,
    enabled: true,
    available: true,
    mockFlag: false,
    name: {
      zh: '货到付款',
      en: 'Cash on delivery',
      tet: 'Paga iha entrega',
      pt: 'Pagamento na entrega',
    },
  },
  {
    id: 'BANK_TRANSFER',
    code: 'BANK_TRANSFER',
    icon: 'account_balance',
    isDefault: false,
    enabled: true,
    available: true,
    mockFlag: false,
    name: {
      zh: '银行转账',
      en: 'Bank transfer',
      tet: 'Transferénsia bank',
      pt: 'Transferência bancária',
    },
  },
  {
    id: 'WECHAT',
    code: 'WECHAT',
    icon: 'wechat',
    isDefault: false,
    enabled: true,
    available: true,
    mockFlag: true,
    name: { zh: '微信支付（国内）', en: 'WeChat Pay', tet: 'WeChat Pay', pt: 'WeChat Pay' },
  },
  {
    id: 'PAYPAL',
    code: 'PAYPAL',
    icon: 'paypal',
    isDefault: false,
    enabled: true,
    available: true,
    mockFlag: true,
    name: { zh: 'PayPal', en: 'PayPal', tet: 'PayPal', pt: 'PayPal' },
  },
  {
    id: 'STRIPE',
    code: 'STRIPE',
    icon: 'credit_card',
    isDefault: false,
    enabled: true,
    available: true,
    mockFlag: true,
    name: { zh: 'Stripe', en: 'Stripe', tet: 'Stripe', pt: 'Stripe' },
  },
  {
    id: 'WECHAT_GLOBAL',
    code: 'WECHAT_GLOBAL',
    icon: 'wechat',
    isDefault: false,
    enabled: true,
    available: false,
    mockFlag: true,
    name: {
      zh: '微信支付（国际版）',
      en: 'WeChat Pay (Global)',
      tet: 'WeChat Pay (Global)',
      pt: 'WeChat Pay (Global)',
    },
  },
  {
    id: 'ALIPAY_CN',
    code: 'ALIPAY_CN',
    icon: 'account_balance_wallet',
    isDefault: false,
    enabled: true,
    available: false,
    mockFlag: true,
    name: { zh: '支付宝', en: 'Alipay', tet: 'Alipay', pt: 'Alipay' },
  },
  {
    id: 'LOCAL_PSP',
    code: 'LOCAL_PSP',
    icon: 'storefront',
    isDefault: false,
    enabled: true,
    available: false,
    mockFlag: true,
    name: { zh: '本地支付', en: 'Local payment', tet: 'Pagamentu lokal', pt: 'Pagamento local' },
  },
];

// 后端真实 icon 短 code（payment-methods.config.ts：cod/bank/wechat/paypal/stripe/wechat-global/alipay/local-psp）
const BACKEND_ICONS: Record<string, string> = {
  COD: 'cod',
  BANK_TRANSFER: 'bank',
  WECHAT: 'wechat',
  PAYPAL: 'paypal',
  STRIPE: 'stripe',
  WECHAT_GLOBAL: 'wechat-global',
  ALIPAY_CN: 'alipay',
  LOCAL_PSP: 'local-psp',
};

const backendItems = (methods: PaymentMethod[]) => ({
  data: {
    items: methods.map((m) => ({
      code: m.code,
      name: m.name,
      subtitle: { en: 'subtitle', zh: '副标题' },
      icon: BACKEND_ICONS[String(m.code)],
      isDefault: !!m.isDefault,
      enabled: true,
      available: m.available !== false,
      mockFlag: !!m.mockFlag,
    })),
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentLocale.mockReturnValue('zh');
  mockUsePaymentMethods.mockReturnValue({ data: makeMethods() });
});

describe('结算页支付方式列表（批B：含占位渠道）', () => {
  it('渲染 8 张渠道卡：5 张可选 + "即将上线"区 3 张占位卡', () => {
    render(<CheckoutPage />, { wrapper });
    // 8 张卡全部渲染（占位卡也可见——列表可见"即将上线"）
    expect(screen.getByTestId('payment-COD')).toBeTruthy();
    expect(screen.getByTestId('payment-WECHAT')).toBeTruthy();
    expect(screen.getByTestId('payment-WECHAT_GLOBAL')).toBeTruthy();
    expect(screen.getByTestId('payment-ALIPAY_CN')).toBeTruthy();
    expect(screen.getByTestId('payment-LOCAL_PSP')).toBeTruthy();
    // "即将上线"区标题 + 3 张占位卡在区内
    expect(screen.getByTestId('coming-soon-block')).toBeTruthy();
    expect(screen.getByText('payment.methods.comingSoonTitle')).toBeTruthy();
  });

  it('占位渠道卡点击提示"暂未开通"，不进入选中态', () => {
    render(<CheckoutPage />, { wrapper });
    fireEvent.press(screen.getByTestId('payment-WECHAT_GLOBAL'));
    expect(mockToastInfo).toHaveBeenCalledWith('payment.methods.comingSoonHint');
  });
});

describe('≈¥ 估算显示（批B：zh + 人民币渠道 + 订单快照）', () => {
  it('计算：formatCnyAmount 分 → 元字符串', () => {
    expect(formatCnyAmount(1447)).toBe('14.47');
    expect(formatCnyAmount(1000)).toBe('10.00');
    expect(formatCnyAmount(5)).toBe('0.05');
  });

  it('纯函数判定：zh + 人民币三渠道触发；非 zh / 非人民币渠道 / 无快照不显示', () => {
    // zh 触发（三渠道）
    expect(shouldShowCnyEstimate('WECHAT', 'zh', 1447)).toBe(true);
    expect(shouldShowCnyEstimate('WECHAT_GLOBAL', 'zh', 1447)).toBe(true);
    expect(shouldShowCnyEstimate('ALIPAY_CN', 'zh', 1447)).toBe(true);
    // 非 zh 不显示
    expect(shouldShowCnyEstimate('WECHAT', 'en', 1447)).toBe(false);
    expect(shouldShowCnyEstimate('WECHAT', 'tet', 1447)).toBe(false);
    expect(shouldShowCnyEstimate('WECHAT', 'pt', 1447)).toBe(false);
    // 非人民币渠道不显示
    expect(shouldShowCnyEstimate('COD', 'zh', 1447)).toBe(false);
    expect(shouldShowCnyEstimate('STRIPE', 'zh', 1447)).toBe(false);
    // 无快照（非人民币单 estimatedCnyAmount=null）不显示
    expect(shouldShowCnyEstimate('WECHAT', 'zh', null)).toBe(false);
    expect(shouldShowCnyEstimate('WECHAT', 'zh', undefined)).toBe(false);
    expect(shouldShowCnyEstimate('WECHAT', 'zh', 0)).toBe(false);
    // 渠道缺失
    expect(shouldShowCnyEstimate(undefined, 'zh', 1447)).toBe(false);
  });
});

// 说明：result 页渲染测试需要 useOrder mock 数据（useOrders 的 useOrder 由顶部统一 mock）
const makeOrder = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'order-1',
  orderNo: 'MM2026090801000001',
  status: 'CONFIRMED',
  items: [],
  totalPrice: 20,
  createdAt: new Date().toISOString(),
  paymentMethod: 'WECHAT',
  estimatedCnyAmount: 1447,
  ...overrides,
});

describe('订单结果页 ≈¥ 显示（批B）', () => {
  beforeEach(() => {
    mockUseOrder.mockReturnValue({
      data: makeOrder(),
      isLoading: false,
      isError: false,
    });
  });

  it('zh + WECHAT + estimatedCnyAmount=1447 → 渲染 payment.estimatedCny（≈ ¥14.47）', () => {
    mockGetCurrentLocale.mockReturnValue('zh');
    render(<OrderResultScreen />, { wrapper });
    expect(screen.getByText('payment.estimatedCny')).toBeTruthy();
  });

  it('非 zh（en）→ 不渲染 ≈¥', () => {
    mockGetCurrentLocale.mockReturnValue('en');
    render(<OrderResultScreen />, { wrapper });
    expect(screen.queryByText('payment.estimatedCny')).toBeNull();
  });

  it('非人民币渠道（COD）→ 不渲染 ≈¥', () => {
    mockUseOrder.mockReturnValue({
      data: makeOrder({ paymentMethod: 'COD', estimatedCnyAmount: null }),
      isLoading: false,
      isError: false,
    });
    render(<OrderResultScreen />, { wrapper });
    expect(screen.queryByText('payment.estimatedCny')).toBeNull();
  });
});

describe('paymentApi.getMethods real 模式 transform（批B）', () => {
  it('映射 code→id、icon 短 code→Material Symbols、available 透传', async () => {
    mockApiGet.mockResolvedValue(backendItems(makeMethods()));
    const methods = await paymentApi.getMethods();
    expect(methods).toHaveLength(8);
    const byCode = Object.fromEntries(methods.map((m) => [m.code, m]));
    // available 透传：5 可选 + 3 占位
    expect(byCode.COD.available).toBe(true);
    expect(byCode.WECHAT.available).toBe(true);
    expect(byCode.WECHAT_GLOBAL.available).toBe(false);
    expect(byCode.ALIPAY_CN.available).toBe(false);
    expect(byCode.LOCAL_PSP.available).toBe(false);
    // icon 短 code → Material Symbols 名（与 mock 数据同表渲染）
    expect(byCode.COD.icon).toBe('payments');
    expect(byCode.BANK_TRANSFER.icon).toBe('account_balance');
    expect(byCode.ALIPAY_CN.icon).toBe('account_balance_wallet');
    expect(byCode.LOCAL_PSP.icon).toBe('storefront');
    // id = 后端大写 code（checkout 提交 toUpperCase 兼容）
    expect(byCode.WECHAT.id).toBe('WECHAT');
    expect(mockApiGet).toHaveBeenCalledWith('/client/payments/methods');
  });
});
