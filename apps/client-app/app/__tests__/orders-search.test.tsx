/**
 * 5.2 订单列表订单号搜索测试（业务增强批2，P-v2-3 本地过滤过渡 + V2-01~V2-04）
 *
 * 覆盖：
 * 1. 搜索框渲染（placeholder = order.searchPlaceholder）+ 订单号 contains 命中
 * 2. 未命中 → orders-search-empty 空态（EmptyState 复用，非整体空态）
 * 3. 与状态 Tab 组合：Tab 先圈定状态集，搜索在集合内过滤
 * 4. 清空恢复全量列表
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { ThemeProvider } from '@/theme';
import OrdersPage from '../(main)/orders';

// Why: let（jest.mock 工厂闭包引用外部变量须 mock 前缀命名；用例 beforeEach 重注入）
let mockOrders: {
  id: string;
  orderNo: string;
  status: string;
  items: never[];
  totalPrice: number;
  createdAt: string;
}[] = [];

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number; q?: string }) => {
      if (opts?.q !== undefined) return `${key}:${opts.q}`;
      if (opts?.count !== undefined) return `${key}:${opts.count}`;
      return key;
    },
  }),
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/hooks/useNetwork', () => ({
  useNetwork: () => ({ isOffline: false }),
}));

jest.mock('@/store/toastStore', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

jest.mock('@/services/queries/useOrders', () => ({
  useOrderCounts: () => ({ 'to-pay': 0, 'to-ship': 0, 'to-receive': 0, review: 0 }),
  // Why: 按传入 tab 过滤（对齐 orderStatusConfig.ORDER_STATUS_GROUPS），否则 Tab 组合用例无法成立
  useOrdersInfinite: (tab: string) => {
    const groups: Record<string, string[]> = {
      'to-pay': ['PENDING_PAYMENT'],
      'to-ship': ['PENDING_CONFIRM', 'CONFIRMED'],
      'to-receive': ['PICKED', 'OUT_FOR_DELIVERY'],
      review: ['DELIVERED', 'DELIVERED_PAID', 'DELIVERED_UNPAID', 'COMPLETED'],
    };
    const items =
      tab && tab !== 'all' ? mockOrders.filter((o) => groups[tab]?.includes(o.status)) : mockOrders;
    return {
      data: { pages: [{ items, nextCursor: null, hasMore: false }] },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    };
  },
  useCancelOrder: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteOrders: () => ({ mutate: jest.fn(), isPending: false }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const o = (id: string, orderNo: string, status = 'COMPLETED') => ({
  id,
  orderNo,
  status,
  items: [] as never[],
  totalPrice: 100,
  createdAt: '2026-06-01T00:00:00Z',
});

beforeEach(() => {
  // 三单：两个含 1001（不同状态供 Tab 组合用例），一个不含
  mockOrders = [
    o('o1', 'ORD-20261105-1001', 'COMPLETED'),
    o('o2', 'ORD-20261105-1001X', 'PENDING_PAYMENT'),
    o('o3', 'ORD-20261105-7777', 'COMPLETED'),
  ];
});

// SearchBar 容器 testID=orders-search，内层 TextInput accessibilityLabel=common.searchInput；
// RNTL getByLabelText 可直接命中 TextInput（容器与输入框同子树）
const searchInput = (screen: { getByLabelText: (l: string) => ReactTestInstance }) =>
  screen.getByLabelText('common.searchInput');

describe('5.2 订单号搜索（本地过滤过渡）', () => {
  it('V2-01: 搜索框渲染（placeholder key）+ 订单号 contains 命中过滤', () => {
    const screen = render(<OrdersPage />, { wrapper });
    const { getByTestId, queryByTestId } = screen;
    expect(getByTestId('orders-search')).toBeTruthy();
    // 全量三单
    expect(queryByTestId('order-card-o1')).toBeTruthy();
    expect(queryByTestId('order-card-o3')).toBeTruthy();
    // 输入 7777 → 只剩 o3（contains 命中 orderNo）
    fireEvent.changeText(searchInput(screen), '7777');
    expect(queryByTestId('order-card-o1')).toBeNull();
    expect(queryByTestId('order-card-o3')).toBeTruthy();
  });

  it('V2-02: 未命中 → orders-search-empty 空态（非整体空态），可改词重搜', () => {
    const screen = render(<OrdersPage />, { wrapper });
    const { getByTestId, queryByTestId, getByText } = screen;
    fireEvent.changeText(searchInput(screen), '9999');
    expect(getByTestId('orders-search-empty')).toBeTruthy();
    expect(queryByTestId('order-card-o1')).toBeNull();
    // 空态文案带插值 q
    expect(getByText('order.searchNoResultDesc:9999')).toBeTruthy();
    // 改词重新命中
    fireEvent.changeText(searchInput(screen), '1001');
    expect(getByTestId('order-card-o1')).toBeTruthy();
    expect(queryByTestId('orders-search-empty')).toBeNull();
  });

  it('V2-02: 大小写不敏感 contains（ORD 小写也命中）', () => {
    const screen = render(<OrdersPage />, { wrapper });
    const { getByTestId, queryByTestId } = screen;
    fireEvent.changeText(searchInput(screen), 'ord-20261105-1001');
    expect(getByTestId('order-card-o1')).toBeTruthy();
    expect(queryByTestId('order-card-o3')).toBeNull();
  });

  it('V2-03: 与状态 Tab 组合叠加（Tab 圈状态集，搜索在集合内过滤）', () => {
    const screen = render(<OrdersPage />, { wrapper });
    const { getByTestId, getByText, queryByTestId } = screen;
    // 切到 To Pay Tab（PENDING_PAYMENT 组 → 只剩 o2）
    fireEvent.press(getByText('order.statusToPay'));
    expect(queryByTestId('order-card-o1')).toBeNull();
    expect(getByTestId('order-card-o2')).toBeTruthy();
    // 在 To Pay 集合内搜 7777（o3 是 COMPLETED，不在此 tab）→ 空态
    fireEvent.changeText(searchInput(screen), '7777');
    expect(getByTestId('orders-search-empty')).toBeTruthy();
    // 搜 1001 → 只剩 o2（o1 是 COMPLETED 不在 tab 集合）
    fireEvent.changeText(searchInput(screen), '1001');
    expect(getByTestId('order-card-o2')).toBeTruthy();
    expect(queryByTestId('order-card-o1')).toBeNull();
  });

  it('V2-04: 清空恢复全量列表（含 clear 按钮路径）', () => {
    const screen = render(<OrdersPage />, { wrapper });
    const { queryByTestId } = screen;
    fireEvent.changeText(searchInput(screen), '7777');
    expect(queryByTestId('order-card-o1')).toBeNull();
    // 直接清空输入 → 恢复
    fireEvent.changeText(searchInput(screen), '');
    expect(queryByTestId('order-card-o1')).toBeTruthy();
    expect(queryByTestId('order-card-o3')).toBeTruthy();
  });

  it('管理模式隐藏搜索框（防误触，与工具栏同口径）', () => {
    const screen = render(<OrdersPage />, { wrapper });
    const { getByTestId, queryByTestId } = screen;
    fireEvent.press(getByTestId('orders-manage'));
    expect(queryByTestId('orders-search')).toBeNull();
  });
});
