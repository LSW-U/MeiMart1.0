/**
 * 批D D2 — 下单结果页预约单标注（scheduledFor，保证金批A T5-c）
 *
 * 覆盖：
 * 1. 订单 scheduledFor 非空 → eta 条渲染 result.acceptingReservation 标注（testID reservation-result-bar）
 * 2. 订单 scheduledFor=null（即时单）→ 维持"预计今日送达"（result.etaFallback）
 * 3. 纯函数判定：scheduledForText 派生（非空 ⇔ 预约态）
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import OrderResultScreen from '../order/result';
import { formatEta } from '@/utils/format';
import type { Order } from '@/types';

// ===== mocks（对齐 payment-methods-batch-b.test.tsx 模式）=====
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () =>
    ({ orderId: 'o-1', orderNo: 'MM001', status: 'CONFIRMED' }) as Record<string, string>,
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

jest.mock('@/i18n', () => ({
  useLocalizer:
    () =>
    (text: unknown): string => {
      const record = text as { en?: string; zh?: string } | string;
      if (typeof record === 'string') return record;
      return record.en ?? record.zh ?? '';
    },
  useLocale: () => 'en',
}));

const mockUseOrder = jest.fn();

jest.mock('@/services/queries/useOrders', () => ({
  useCreateOrder: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useOrder: (...args: unknown[]) => mockUseOrder(...args),
  useCancelOrder: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/store/toastStore', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

jest.mock('@/services/api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
  isMockMode: false,
}));

jest.mock('@/services/mockDb', () => ({
  mockDb: { payments: [], orders: [] },
  mockResponse: async (value: unknown) => value,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const makeOrder = (scheduledFor: string | null): Order => ({
  id: 'o-1',
  orderNo: 'MM001',
  status: 'CONFIRMED',
  items: [],
  totalPrice: 12,
  createdAt: '2026-09-11T10:00:00Z',
  paymentMethod: 'COD',
  deliveryFee: 0,
  discountAmount: 0,
  scheduledFor,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('下单结果页预约单标注（批D D2）', () => {
  it('scheduledFor 非空 → 渲染 result.acceptingReservation 标注', () => {
    mockUseOrder.mockReturnValue({ data: makeOrder('2026-09-12T02:00:00.000Z') });
    render(<OrderResultScreen />, { wrapper });
    expect(screen.getByTestId('eta-bar-text')).toBeTruthy();
    expect(screen.getByText('result.acceptingReservation')).toBeTruthy();
  });

  it('scheduledFor=null（即时单）→ 维持"预计今日送达"', () => {
    mockUseOrder.mockReturnValue({ data: makeOrder(null) });
    render(<OrderResultScreen />, { wrapper });
    expect(screen.queryByText('result.acceptingReservation')).toBeNull();
    // eta 条整体文本拼接为 "result.eta：result.etaFallback"（mock t 返回 key 本身）
    expect(screen.getByTestId('eta-bar-text')).toBeTruthy();
    expect(screen.getByTestId('eta-bar-text').props.children).toBe(
      'result.eta：result.etaFallback',
    );
  });

  it('纯函数：formatEta 把 scheduledFor ISO 格式化为本地时间文本（非空 ⇔ 预约态判定输入）', () => {
    expect(formatEta('2026-09-12T02:00:00.000Z', 'en')).not.toBe('');
    expect(formatEta('invalid-iso', 'en')).toBe('invalid-iso');
  });
});
