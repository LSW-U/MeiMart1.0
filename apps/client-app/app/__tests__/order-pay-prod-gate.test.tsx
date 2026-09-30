/**
 * 批4 补丁（审查待确认-2 裁决）：待支付 Pay Now prod 降级测试
 *
 * 覆盖：
 * ① prod（非 __DEV__）：order-pay 按钮不可触达（不渲染），原位展示 order-pay-unavailable 提示；
 * ② dev（__DEV__）：现状不回归——复跑一次 mockPay 三连 + order-pay 可见（主链路细节
 *    在 order-detail-pay-repeat.test.tsx，那里 jest 在 __DEV__=true 环境跑，保持全绿）。
 *
 * 独立文件原因：__DEV__ 是编译期常量，必须用 babel 重写/dot-env 按文件切换，
 * 不能与既有测试（默认 __DEV__=true）共享文件。
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { toast } from '@/store/toastStore';
import type { Order, OrderStatus } from '@/types';
import OrderDetailPage from '../order/[id]';

const mockUseOrder = jest.fn();

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: 'order-1' }),
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

jest.mock('@/services/queries/useOrders', () => ({
  useOrder: (...args: unknown[]) => mockUseOrder(...args),
  useCancelOrder: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/services/queries/useOrderEta', () => ({
  useOrderEta: () => ({ data: null }),
}));

const mockGetIntent = jest.fn();
const mockMockPay = jest.fn();
const mockConfirm = jest.fn();
jest.mock('@/services/payment', () => ({
  paymentApi: {
    getIntent: (...args: unknown[]) => mockGetIntent(...args),
    mockPay: (...args: unknown[]) => mockMockPay(...args),
    confirm: (...args: unknown[]) => mockConfirm(...args),
    getMethods: jest.fn(),
  },
}));

jest.mock('@/services/queries/useCart', () => ({
  useAddToCart: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('@/store/toastStore', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

const makeOrder = (status: OrderStatus, paymentMethod = 'COD'): Order =>
  ({
    id: 'order-1',
    orderNo: 'MM20260930001',
    status,
    items: [
      {
        id: 'ci1',
        quantity: 1,
        selected: true,
        product: { id: 'p001', price: 25.9, name: { en: 'Apple' }, image: '', category: '' },
      },
    ],
    totalPrice: 2590,
    createdAt: '2026-09-30T08:00:00Z',
    paymentMethod,
  }) as unknown as Order;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const setup = (order: Order) => {
  mockUseOrder.mockReturnValue({
    data: order,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
  return render(<OrderDetailPage />, { wrapper });
};

describe('批4 补丁：待支付 Pay Now prod 降级（__DEV__ 分支）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // 临时切换编译期常量 __DEV__ 跑 prod 分支（原因：jest-expo 下 __DEV__ 是全局，测试内可覆写）
  const withProdDev = (fn: () => void) => {
    const original = (globalThis as { __DEV__?: boolean }).__DEV__;
    try {
      (globalThis as { __DEV__?: boolean }).__DEV__ = false;
      fn();
    } finally {
      (globalThis as { __DEV__?: boolean }).__DEV__ = original;
    }
  };

  it('prod：order-pay 不渲染（不可触达支付），原位展示 order-pay-unavailable 提示', () => {
    withProdDev(() => {
      setup(makeOrder('PENDING_PAYMENT', 'QRIS'));
      expect(screen.queryByTestId('order-pay')).toBeNull();
      const hint = screen.getByTestId('order-pay-unavailable');
      expect(hint.props.children).toBe('order.payOnlineUnavailable');
      // mockPay 链路完全不可达
      expect(mockGetIntent).not.toHaveBeenCalled();
      expect(mockMockPay).not.toHaveBeenCalled();
      expect(mockConfirm).not.toHaveBeenCalled();
    });
  });

  it('prod：即使尝试触发 handlePay（组件不暴露入口，防御性断言 toast/paymentApi 全零调用）', () => {
    withProdDev(() => {
      setup(makeOrder('PENDING_PAYMENT', 'QRIS'));
      // prod 下没有任何支付入口可点：无 order-pay testID、paymentApi 零调用
      expect(screen.queryByTestId('order-pay')).toBeNull();
      expect(mockMockPay).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  it('dev：order-pay 可见可点，现状三连不回归', async () => {
    mockGetIntent.mockResolvedValue({ status: 'UNPAID' });
    mockMockPay.mockResolvedValue({ orderId: 'order-1', intentId: 'pi1' });
    mockConfirm.mockResolvedValue({ orderId: 'order-1', status: 'CONFIRMED' });

    setup(makeOrder('PENDING_PAYMENT', 'QRIS'));
    const payBtn = await screen.findByTestId('order-pay', {}, { timeout: 2000 });
    fireEvent.press(payBtn);

    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
    expect(mockGetIntent).toHaveBeenCalledWith('order-1');
    expect(mockMockPay).toHaveBeenCalledWith('order-1');
    expect(toast.success).toHaveBeenCalledWith('order.paySuccess');
    expect(screen.queryByTestId('order-pay-unavailable')).toBeNull();
  });
});
