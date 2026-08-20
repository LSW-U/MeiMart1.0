/**
 * 订单结果页 P28 — 成功态渲染测试（按 HTML PaymentResultPage 还原）
 *
 * 放 app 下 __tests__ 目录（括号子目录不被 jest testMatch 发现，见 order-detail-banner.test 注释）。
 *
 * 覆盖：
 * 1. 渲染成功标题 successTitle2（"Thank you for your order!"）
 * 2. 渲染支付成功提示 paymentSuccess（含金额）
 * 3. 渲染订单详情卡三段（ORDER ID / Estimated arrival / 收货地址）
 * 4. 渲染纵向两按钮 trackOrder + continueShopping
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import type { Address, Order } from '@/types';
import OrderResultScreen from '../order/result';

const mockUseOrder = jest.fn();
const mockUseOrderEta = jest.fn();

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({} as Record<string, string>),
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    // t 返回 key 本身，便于断言具体 key；插值占位原样保留便于断言含金额
    t: (key: string, opts?: { amount?: string }) =>
      opts?.amount ? `${key}__${opts.amount}` : key,
    i18n: { language: 'en' },
  }),
}));

jest.mock('@/services/queries/useOrders', () => ({
  useOrder: (...args: unknown[]) => mockUseOrder(...args),
}));

jest.mock('@/services/queries/useOrderEta', () => ({
  useOrderEta: (...args: unknown[]) => mockUseOrderEta(...args),
}));

const address: Address = {
  id: 'addr-1',
  name: 'Maria Guterres',
  phone: '+67077777777',
  province: 'Dili',
  city: 'Dili',
  district: 'Cristo Rei',
  detail: 'Rua de Christo Rei, No. 45',
  isDefault: true,
};

const makeOrder = (): Order => ({
  id: 'order-1',
  orderNo: 'MEI-98234',
  status: 'CONFIRMED',
  items: [],
  totalPrice: 15.5,
  createdAt: '2026-08-20T08:00:00Z',
  address,
  paymentMethod: 'COD',
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

function setup(opts: { orderId?: string; orderNo?: string; withOrder?: boolean } = {}) {
  const routerMock = jest.requireMock('expo-router');
  routerMock.useLocalSearchParams = () => ({
    orderId: opts.orderId,
    orderNo: opts.orderNo,
  });
  mockUseOrder.mockReturnValue({
    data: opts.withOrder ? makeOrder() : undefined,
    isLoading: false,
    isError: false,
  });
  // 成功态 CONFIRMED 无 task → useOrderEta 返回 null（用 etaFallback 兜底）
  mockUseOrderEta.mockReturnValue({ data: null });
  return render(<OrderResultScreen />, { wrapper });
}

describe('订单结果页 P28 — 成功态', () => {
  it('渲染成功标题 + 支付金额成功提示', () => {
    setup({ orderId: 'order-1', orderNo: 'MEI-98234', withOrder: true });
    expect(screen.getByText('result.successTitle2')).toBeTruthy();
    // paymentSuccess 含插值金额，mock t 拼成 key__amount
    expect(screen.getByText('result.paymentSuccess__$15.50')).toBeTruthy();
  });

  it('渲染订单详情卡：订单号 + 预计送达 + 收货地址', () => {
    setup({ orderId: 'order-1', orderNo: 'MEI-98234', withOrder: true });
    // 段 1：ORDER ID（label-caps + 订单号）
    expect(screen.getByText('result.orderIdLabel')).toBeTruthy();
    expect(screen.getByText('MEI-98234')).toBeTruthy();
    // 段 2：Estimated arrival（标题 + 兜底文案，因为 useOrderEta 返回 null）
    expect(screen.getByText('result.estimatedArrival')).toBeTruthy();
    expect(screen.getByText('result.etaFallback')).toBeTruthy();
    // 段 3：收货地址（收件人 + 地址行）
    expect(screen.getByText('Maria Guterres')).toBeTruthy();
    expect(screen.getByText('Rua de Christo Rei, No. 45, Cristo Rei, Dili')).toBeTruthy();
  });

  it('渲染纵向两按钮：trackOrder + continueShopping', () => {
    setup({ orderId: 'order-1', orderNo: 'MEI-98234', withOrder: true });
    expect(screen.getByText('result.trackOrder')).toBeTruthy();
    expect(screen.getByText('result.continueShopping')).toBeTruthy();
  });

  it('渲染 italic 邮件提示', () => {
    setup({ orderId: 'order-1', orderNo: 'MEI-98234', withOrder: true });
    expect(screen.getByText('result.confirmationNote')).toBeTruthy();
  });
});
