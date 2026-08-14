/**
 * OrderDetailPage 状态 Banner + Badge 渲染测试（P10 修复回归）
 *
 * 放 app 下 __tests__ 目录（非 app/order 括号子目录）：jest testMatch 的 micromatch
 * 把括号目录名当 extglob 语法，括号路径不匹配测试发现规则（refunds.test 模式）。
 *
 * 覆盖 P10 三个断言点：
 * 1. CONFIRMED：badge=confirmed（非 paid 误显 AWAITING SHIPMENT）+ banner=preparing（非死文案 arrivingInDays）
 * 2. PENDING_CONFIRM：badge=confirming（非 paid）
 * 3. OUT_FOR_DELIVERY + useOrderEta 返回 ETA：banner 走 arrivingEta 插值（formatEta 输出）
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { formatEta } from '@/utils/format';
import type { Order, OrderStatus } from '@/types';
import OrderDetailPage from '../order/[id]';

const mockUseOrder = jest.fn();
const mockUseOrderEta = jest.fn();

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: 'order-1' }),
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  // t 返回 key 本身（插值变量拼接在后），断言直接对 key
  useTranslation: () => ({
    t: (key: string, opts?: { eta?: string }) => (opts?.eta ? `${key}:${opts.eta}` : key),
    i18n: { language: 'en' },
  }),
}));

jest.mock('@/services/queries/useOrders', () => ({
  useOrder: (...args: unknown[]) => mockUseOrder(...args),
  useCancelOrder: () => ({ mutate: jest.fn() }),
}));

jest.mock('@/services/queries/useOrderEta', () => ({
  useOrderEta: (...args: unknown[]) => mockUseOrderEta(...args),
}));

const makeOrder = (status: OrderStatus): Order => ({
  id: 'order-1',
  orderNo: 'MM20260814001',
  status,
  items: [],
  totalPrice: 2500,
  createdAt: '2026-08-14T08:00:00Z',
  paymentMethod: 'COD',
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const setup = (status: OrderStatus, eta: string | null) => {
  mockUseOrder.mockReturnValue({
    data: makeOrder(status),
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
  mockUseOrderEta.mockReturnValue({ data: eta });
  return render(<OrderDetailPage />, { wrapper });
};

describe('OrderDetailPage 状态 Banner/Badge（P10）', () => {
  it('CONFIRMED：badge=confirmed、banner=preparing，不再出现 arrivingInDays 死文案', () => {
    setup('CONFIRMED', null);
    expect(screen.getByText('ORDER.STATUS.CONFIRMED')).toBeTruthy();
    expect(screen.getByText('order.bannerValue.preparing')).toBeTruthy();
    expect(screen.queryByText(/Arriving in 2-3 days/i)).toBeNull();
  });

  it('PENDING_CONFIRM：badge=confirming，不再误显 paid（Awaiting shipment）', () => {
    setup('PENDING_CONFIRM', null);
    expect(screen.getByText('ORDER.STATUS.CONFIRMING')).toBeTruthy();
    expect(screen.queryByText('ORDER.STATUS.PAID')).toBeNull();
  });

  it('OUT_FOR_DELIVERY + 有 ETA：banner 走 arrivingEta 插值（formatEta 输出）', () => {
    const eta = '2026-08-15T09:45:00Z';
    setup('OUT_FOR_DELIVERY', eta);
    expect(screen.getByText(`order.bannerValue.arrivingEta:${formatEta(eta, 'en-US')}`)).toBeTruthy();
    // fallback 文案不再出现
    expect(screen.queryByText('order.bannerValue.outForDelivery')).toBeNull();
  });

  it('OUT_FOR_DELIVERY + 无 ETA（getTracking 失败/无 task）：fallback 到 outForDelivery 文案', () => {
    setup('OUT_FOR_DELIVERY', null);
    expect(screen.getByText('order.bannerValue.outForDelivery')).toBeTruthy();
  });

  it('useOrderEta 在 loading 兜底外仍被无条件调用（hooks 规则），status 透传', () => {
    setup('CONFIRMED', null);
    expect(mockUseOrderEta).toHaveBeenCalledWith('order-1', 'CONFIRMED');
  });
});
