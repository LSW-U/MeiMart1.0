/**
 * C-P3-4/5（批4）订单详情页新交互测试（P2-3 审查修复）
 *
 * 覆盖审查报告 P2-3 点名的两条路径：
 * ① handlePay：orders.tsx pay → 详情页原位支付——断言不经 /order/checkout、
 *    paymentApi 三连（getIntent → mockPay → confirm）按序调用；
 * ② handleRepeatOrder：部分失败 → toast.info(repeatPartial) 且仍跳购物车。
 *
 * 独立文件原因：jest.mock 文件级——本文件 mock paymentApi/useCart 精确控制三连与加购结果，
 * 不与 order-detail-banner.test.tsx（只测 Banner/Badge）共享 mock 配置。
 *
 * 放 app/__tests__ 目录：jest testMatch 的 micromatch 把括号目录名当 extglob，
 * app/order 括号子路径不匹配测试发现规则（refunds.test 模式）。
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { router } from 'expo-router';
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
  // t 返回 key 本身（带插值时拼 count/ok/total 便于断言）
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && 'ok' in opts ? `${key}:${opts.ok}/${opts.total}` : key,
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

// paymentApi 三连注入点（P2-3 ①：按序断言）
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

// useAddToCart 注入点（P2-3 ②：部分失败）
const mockAddToCartMutateAsync = jest.fn();
jest.mock('@/services/queries/useCart', () => ({
  useAddToCart: () => ({
    mutateAsync: (...args: unknown[]) => mockAddToCartMutateAsync(...args),
    isPending: false,
  }),
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
      {
        id: 'ci2',
        quantity: 2,
        selected: true,
        product: { id: 'p002', price: 10, name: { en: 'Pear' }, image: '', category: '' },
      },
    ],
    totalPrice: 4590,
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

describe('C-P3-4 原位支付（handlePay，P2-3 ①）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('press order-pay → 不跳 /order/checkout + paymentApi 三连按序（getIntent→mockPay→confirm）', async () => {
    mockGetIntent.mockResolvedValue({ status: 'UNPAID' });
    mockMockPay.mockResolvedValue({ orderId: 'order-1', intentId: 'pi1' });
    mockConfirm.mockResolvedValue({ orderId: 'order-1', status: 'CONFIRMED' });

    setup(makeOrder('PENDING_PAYMENT', 'QRIS'));
    const payBtn = await screen.findByTestId('order-pay', {}, { timeout: 2000 });
    fireEvent.press(payBtn);

    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
    // 三连按序：getIntent → mockPay → confirm（同 orderId）
    expect(mockGetIntent).toHaveBeenCalledWith('order-1');
    expect(mockMockPay).toHaveBeenCalledWith('order-1');
    expect(mockConfirm).toHaveBeenCalledWith('order-1');
    const intentCalls = mockGetIntent.mock.invocationCallOrder[0];
    const payCalls = mockMockPay.mock.invocationCallOrder[0];
    const confirmCalls = mockConfirm.mock.invocationCallOrder[0];
    expect(intentCalls).toBeLessThan(payCalls);
    expect(payCalls).toBeLessThan(confirmCalls);

    // C-P3-4 核心：不经 checkout（防重复下单）
    expect(router.push).not.toHaveBeenCalledWith('/order/checkout');
    expect(router.push).not.toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/order/checkout' }),
    );
    // 成功提示
    expect(toast.success).toHaveBeenCalledWith('order.paySuccess');
  });

  it('intent 已 PAID → 幂等早退，不重复支付', async () => {
    mockGetIntent.mockResolvedValue({ status: 'PAID' });
    setup(makeOrder('PENDING_PAYMENT', 'QRIS'));
    fireEvent.press(await screen.findByTestId('order-pay', {}, { timeout: 2000 }));
    await waitFor(() => expect(mockGetIntent).toHaveBeenCalledTimes(1));
    expect(mockMockPay).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith('order.payAlreadyPaid');
  });

  it('支付链路失败 → toast.error(payFailed) 不跳页', async () => {
    mockGetIntent.mockRejectedValue(new Error('network down'));
    setup(makeOrder('PENDING_PAYMENT', 'QRIS'));
    fireEvent.press(await screen.findByTestId('order-pay', {}, { timeout: 2000 }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('order.payFailed'));
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('C-P3-5 再买/复购（handleRepeatOrder，P2-3 ②）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('部分失败 → toast.info(repeatPartial 1/2) 且仍跳购物车', async () => {
    mockAddToCartMutateAsync
      .mockResolvedValueOnce(undefined) // 第一项成功
      .mockRejectedValueOnce(new Error('SOLD_OUT')); // 第二项失败（继续不中止）

    setup(makeOrder('DELIVERED'));
    fireEvent.press(await screen.findByTestId('order-repeat', {}, { timeout: 2000 }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/(main)/cart'));
    // 单项失败继续：两次加购都发起
    expect(mockAddToCartMutateAsync).toHaveBeenCalledTimes(2);
    // 部分成功统计 toast（1/2）
    expect(toast.info).toHaveBeenCalledWith('order.repeatPartial:1/2');
    // 不是全失败（不弹 repeatFailed、不中止跳转）
    expect(toast.error).not.toHaveBeenCalledWith('order.repeatFailed');
  });

  it('全部失败 → toast.error(repeatFailed) 中止，不跳购物车', async () => {
    mockAddToCartMutateAsync.mockRejectedValue(new Error('SOLD_OUT'));
    setup(makeOrder('DELIVERED'));
    fireEvent.press(await screen.findByTestId('order-repeat', {}, { timeout: 2000 }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('order.repeatFailed'));
    expect(router.push).not.toHaveBeenCalledWith('/(main)/cart');
  });

  it('订单 0 项 → toast.info(repeatEmpty) guard，不加购不跳转', async () => {
    const empty = makeOrder('DELIVERED');
    (empty as { items: unknown[] }).items = [];
    setup(empty);
    fireEvent.press(await screen.findByTestId('order-repeat', {}, { timeout: 2000 }));
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith('order.repeatEmpty'));
    expect(mockAddToCartMutateAsync).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalledWith('/(main)/cart');
  });
});

// ── 第三轮新增代码修复 批1（N-P2-11）：连点锁 ──
describe('N-P2-11 连点支付/复购只走一次流程', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('同帧连点 Pay Now → paymentApi 三连各只调 1 次', async () => {
    // getIntent 挂起期间连点第二下（state 未变，state 守卫拦不住）
    let releaseIntent: (v: { status: string }) => void;
    mockGetIntent.mockReturnValue(
      new Promise((resolve) => {
        releaseIntent = resolve;
      }),
    );
    mockMockPay.mockResolvedValue({ orderId: 'order-1' });
    mockConfirm.mockResolvedValue({ orderId: 'order-1' });

    setup(makeOrder('PENDING_PAYMENT', 'QRIS'));
    const payBtn = await screen.findByTestId('order-pay', {}, { timeout: 2000 });
    fireEvent.press(payBtn);
    fireEvent.press(payBtn); // 同帧第二击（getIntent 仍挂起）
    releaseIntent!({ status: 'UNPAID' });

    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
    expect(mockGetIntent).toHaveBeenCalledTimes(1);
    expect(mockMockPay).toHaveBeenCalledTimes(1);
  });

  it('复购进行中连点 → addToCart 只发起一轮（2 项）', async () => {
    let releaseFirst: (v: undefined) => void;
    mockAddToCartMutateAsync.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseFirst = resolve;
        }),
    );
    mockAddToCartMutateAsync.mockResolvedValueOnce(undefined);

    setup(makeOrder('DELIVERED'));
    const repeatBtn = await screen.findByTestId('order-repeat', {}, { timeout: 2000 });
    fireEvent.press(repeatBtn);
    fireEvent.press(repeatBtn); // 第一项加购挂起期间连点
    releaseFirst!(undefined);

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/(main)/cart'));
    expect(mockAddToCartMutateAsync).toHaveBeenCalledTimes(2); // 一轮的 2 项，非 4 项
  });
});

// ── N-P2-1（D6 第二层）：pay/repeat 挂起期 disabled（ref 锁之外的可达性双保险）──
describe('N-P2-1 pay/repeat 挂起期 disabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('支付挂起期 order-pay accessibilityState.disabled=true，结束后恢复 false', async () => {
    let releaseIntent: (v: { status: string }) => void;
    mockGetIntent.mockReturnValue(
      new Promise((resolve) => {
        releaseIntent = resolve;
      }),
    );

    setup(makeOrder('PENDING_PAYMENT', 'QRIS'));
    const payBtn = await screen.findByTestId('order-pay', {}, { timeout: 2000 });
    expect(payBtn.props.accessibilityState).toMatchObject({ disabled: false });

    fireEvent.press(payBtn);
    // 挂起期（getIntent 未 resolve）：disabled 置位
    await waitFor(() =>
      expect(screen.getByTestId('order-pay').props.accessibilityState).toMatchObject({
        disabled: true,
      }),
    );

    releaseIntent!({ status: 'UNPAID' });
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
    // 流程结束恢复可点
    await waitFor(() =>
      expect(screen.getByTestId('order-pay').props.accessibilityState).toMatchObject({
        disabled: false,
      }),
    );
  });

  it('复购挂起期 order-repeat disabled=true，结束后恢复（全部失败路径也复位）', async () => {
    mockAddToCartMutateAsync.mockRejectedValue(new Error('SOLD_OUT'));

    setup(makeOrder('DELIVERED'));
    const repeatBtn = await screen.findByTestId('order-repeat', {}, { timeout: 2000 });
    expect(repeatBtn.props.accessibilityState).toMatchObject({ disabled: false });

    fireEvent.press(repeatBtn);
    await waitFor(() =>
      expect(screen.getByTestId('order-repeat').props.accessibilityState).toMatchObject({
        disabled: true,
      }),
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('order.repeatFailed'));
    // 失败路径 finally 复位
    await waitFor(() =>
      expect(screen.getByTestId('order-repeat').props.accessibilityState).toMatchObject({
        disabled: false,
      }),
    );
  });
});
