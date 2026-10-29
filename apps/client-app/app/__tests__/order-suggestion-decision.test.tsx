/**
 * SuggestionConfirmModal 决策链路测试（替换品批1 P1-1 修复回归）
 *
 * P1-1 缺陷：详情页 handleDecide mutate 入参硬编码 accept:true —— 点 Decline
 * 实际发 accept=true（采纳），用户意图被反转。修复后入参为 input:{ accept }。
 *
 * 本文件两条测试锁死：
 * 1. 点 Accept → mutate 收到 accept=true
 * 2. 点 Decline → mutate 收到 accept=false（P1-1 核心回归点）
 *
 * 放 app/__tests__（非 app/order 括号子目录）：jest testMatch micromatch 把括号
 * 目录名当 extglob 语法（order-detail-banner.test.tsx 同款纪律）。
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import type { Order } from '@/types';
import OrderDetailPage from '../order/[id]';

const mockUseOrder = jest.fn();
const mockMutate = jest.fn();

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: 'order-1' }),
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  // t 返回 key 本身，断言直接对 key
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

jest.mock('@/services/queries/useOrders', () => ({
  useOrder: (...args: unknown[]) => mockUseOrder(...args),
  useCancelOrder: () => ({ mutate: jest.fn() }),
  // 捕获 mutate 入参——P1-1 断言点（accept 是否透传用户点击的按钮）
  useDecideSuggestion: () => ({ mutate: mockMutate, isPending: false }),
}));

jest.mock('@/services/queries/useOrderEta', () => ({
  useOrderEta: () => ({ data: null }),
}));

jest.mock('@/services/queries/useCart', () => ({
  useAddToCart: () => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false }),
}));

// CONFIRMED 单 + 1 个 PENDING 建议项（含 suggestionItem 摘要，P2-3 真对比数据源）
const makeOrder = (): Order => ({
  id: 'order-1',
  orderNo: 'MM20261029001',
  status: 'CONFIRMED',
  items: [
    {
      id: 'item-1',
      product: {
        id: 'p-1',
        name: { en: 'Milk' },
        price: 10,
        image: 'https://example.com/milk.png',
        category: '',
      },
      quantity: 1,
      selected: true,
      outOfStockQty: 1,
      suggestionStatus: 'PENDING',
      suggestionDecidedAt: null,
      suggestionItem: { name: { en: 'Soy Milk' }, image: null, unitPrice: 800 },
    },
  ],
  totalPrice: 10,
  createdAt: '2026-10-29T08:00:00Z',
  paymentMethod: 'COD',
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const setup = () => {
  mockUseOrder.mockReturnValue({
    data: makeOrder(),
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
  return render(<OrderDetailPage />, { wrapper });
};

describe('SuggestionConfirmModal 决策链路（P1-1）', () => {
  beforeEach(() => {
    mockMutate.mockClear();
  });

  it('点 Accept → mutate 收到 accept=true', () => {
    setup();
    // 打开弹层（badge 可点）
    fireEvent.press(screen.getByText('order.suggestion.pendingBadge'));
    fireEvent.press(screen.getByText('order.suggestion.accept'));
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate.mock.calls[0][0].input).toEqual({ accept: true });
  });

  it('点 Decline → mutate 收到 accept=false（P1-1 核心回归：不再硬编码 true）', () => {
    setup();
    fireEvent.press(screen.getByText('order.suggestion.pendingBadge'));
    fireEvent.press(screen.getByText('order.suggestion.decline'));
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate.mock.calls[0][0].input).toEqual({ accept: false });
  });
});
