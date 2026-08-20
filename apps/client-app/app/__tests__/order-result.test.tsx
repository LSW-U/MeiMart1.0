/**
 * 订单结果页 P28 — 5 状态机渲染测试
 *
 * 放 app 下 __tests__ 目录（括号子目录不被 jest testMatch 发现，见 order-detail-banner.test 注释）。
 *
 * 覆盖：
 * 1. S1 成功态：渲染 successTitle2 + continueShopping + viewOrder，不渲染倒计时条/失败卡
 * 2. S2 待支付：渲染 pendingTitle + payNow + 倒计时条（countdownLabel），不渲染失败卡
 * 3. S4 下单失败（无 orderId/status undefined）：渲染 orderFailTitle + 失败原因卡 + reorder，不渲染摘要卡
 * 4. S5 超时态（status=CANCELLED）：渲染 cancelledTitle + countdownExpired
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import type { Order, OrderStatus } from '@/types';
import OrderResultScreen from '../order/result';

const mockUseOrder = jest.fn();
const mockUseCancelOrder = jest.fn();

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({} as Record<string, string>),
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    // t 返回 key 本身，便于断言具体 key
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

jest.mock('@/services/queries/useOrders', () => ({
  useOrder: (...args: unknown[]) => mockUseOrder(...args),
  useCancelOrder: () => mockUseCancelOrder(),
}));

jest.mock('@/components/cultural/TaisDivider', () => ({
  TaisDivider: () => null,
}));

const makeOrder = (status: OrderStatus, createdAt?: string): Order => ({
  id: 'order-1',
  orderNo: 'MM20260820001',
  status,
  items: [],
  totalPrice: 2500,
  createdAt: createdAt ?? '2026-08-20T08:00:00Z',
  paymentMethod: 'COD',
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

interface SetupOpts {
  orderId?: string;
  orderNo?: string;
  status?: string;
  orderStatus?: OrderStatus;
}

function setup(opts: SetupOpts = {}) {
  // 动态覆盖 useLocalSearchParams 返回值
  const routerMock = jest.requireMock('expo-router');
  routerMock.useLocalSearchParams = () => ({
    orderId: opts.orderId,
    orderNo: opts.orderNo,
    status: opts.status,
  });
  mockUseCancelOrder.mockReturnValue({ mutate: jest.fn(), isPending: false });
  // createdAt 用 now + 20min（保证 S2 待支付倒计时未到期，不误切 S5）
  const createdAt =
    opts.orderId || opts.orderStatus
      ? new Date(Date.now() + 20 * 60 * 1000).toISOString()
      : undefined;
  mockUseOrder.mockReturnValue({
    data: opts.orderId ? makeOrder(opts.orderStatus ?? 'PENDING_PAYMENT', createdAt) : undefined,
    isLoading: false,
    isError: false,
  });
  return render(<OrderResultScreen />, { wrapper });
}

describe('订单结果页 P28 — 5 状态机', () => {
  it('S1 成功态：渲染 successTitle2 + continueShopping/viewOrder，无倒计时条/失败卡', () => {
    setup({ orderId: 'order-1', orderNo: 'MM20260820001', status: 'CONFIRMED', orderStatus: 'CONFIRMED' });
    expect(screen.getByText('result.successTitle2')).toBeTruthy();
    expect(screen.getByText('result.continueShopping')).toBeTruthy();
    expect(screen.getByText('result.viewOrder')).toBeTruthy();
    expect(screen.queryByText('result.countdownLabel')).toBeNull();
    expect(screen.queryByText('result.failReason')).toBeNull();
  });

  it('S2 待支付：渲染 pendingTitle + payNow + 倒计时条，无失败卡', () => {
    setup({ orderId: 'order-1', orderNo: 'MM20260820001', status: 'PENDING_PAYMENT', orderStatus: 'PENDING_PAYMENT' });
    expect(screen.getByText('result.pendingTitle')).toBeTruthy();
    expect(screen.getByText('result.payNow')).toBeTruthy();
    expect(screen.getByText('result.countdownLabel')).toBeTruthy();
    expect(screen.queryByText('result.failReason')).toBeNull();
  });

  it('S4 下单失败（status undefined，无 orderId）：渲染 orderFailTitle + 失败原因卡 + reorder，无摘要卡', () => {
    setup({});
    expect(screen.getByText('result.orderFailTitle')).toBeTruthy();
    expect(screen.getByText('result.failReason')).toBeTruthy();
    expect(screen.getByText('result.reorder')).toBeTruthy();
    // 无 orderId → 不拉详情 → 不渲染 orderInfo 摘要卡
    expect(screen.queryByText('result.orderInfo')).toBeNull();
  });

  it('S5 超时态（status=CANCELLED）：渲染 cancelledTitle + countdownExpired', () => {
    setup({ orderId: 'order-1', orderNo: 'MM20260820001', status: 'CANCELLED', orderStatus: 'CANCELLED' });
    expect(screen.getByText('result.cancelledTitle')).toBeTruthy();
    expect(screen.getByText('result.countdownExpired')).toBeTruthy();
  });
});
