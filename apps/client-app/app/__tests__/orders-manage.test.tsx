/**
 * 订单列表管理模式测试（批3 #5 订单删除，C1~C3）
 *
 * 覆盖：管理入口进/退管理模式（C1）、整卡勾选 + 删除计数联动（C1）、
 * 管理底栏（全选 + 删除）、Alert 二次确认（Native mock execute）、
 * 离线阻止提示（C2）、删除成功 toast + 退出模式、counts 不在本页断言（hook 层覆盖）。
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ThemeProvider } from '@/theme';
import { toast } from '@/store/toastStore';
import OrdersPage from '../(main)/orders';

const mockDeleteMutate = jest.fn();
let mockDeletePending = false;
let mockIsOffline = false;
let mockOrders: {
  id: string;
  orderNo: string;
  status: string;
  items: never[];
  totalPrice: number;
  createdAt: string;
}[] = [];

const pushState = { push: jest.fn() };

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) =>
      opts?.count !== undefined ? `${key}:${opts.count}` : key,
  }),
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/hooks/useNetwork', () => ({
  useNetwork: () => ({ isOffline: mockIsOffline }),
}));

// Why: toast 是 imperative store 调用（非渲染节点），C2 离线提示断言走 mock 而非查 DOM
jest.mock('@/store/toastStore', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

jest.mock('@/services/queries/useOrders', () => ({
  useOrderCounts: () => ({ 'to-pay': 0, 'to-ship': 0, 'to-receive': 0, review: 0 }),
  useOrdersInfinite: () => ({
    data: { pages: [{ items: mockOrders, nextCursor: null, hasMore: false }] },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
  useCancelOrder: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteOrders: () => ({ mutate: mockDeleteMutate, isPending: mockDeletePending }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const o = (id: string, status = 'PENDING_PAYMENT') => ({
  id,
  orderNo: `ORD-${id}`,
  status,
  items: [] as never[],
  totalPrice: 100,
  createdAt: '2026-06-01T00:00:00Z',
});

beforeEach(() => {
  mockDeleteMutate.mockReset();
  mockDeletePending = false;
  mockIsOffline = false;
  pushState.push.mockReset();
  mockOrders = [o('o1'), o('o2', 'CONFIRMED')];
});

describe('订单列表管理模式（批3）', () => {
  it('C1：默认列表态显示「管理」入口 + help（原能力保留）', () => {
    const { getByTestId } = render(<OrdersPage />, { wrapper });
    expect(getByTestId('orders-manage')).toBeTruthy();
    expect(getByTestId('orders-help')).toBeTruthy();
  });

  it('C1：点管理 → 进管理模式（标题换已选计数、底栏出现；help 让位取消钮）', () => {
    const { getByTestId, queryByTestId, getByText } = render(<OrdersPage />, { wrapper });
    fireEvent.press(getByTestId('orders-manage'));
    expect(getByTestId('orders-exit-select')).toBeTruthy();
    expect(getByText('order.selectedTitle:0')).toBeTruthy();
    expect(getByTestId('orders-batch-delete')).toBeTruthy();
    expect(queryByTestId('orders-help')).toBeNull();
  });

  it('C1：管理模式点卡勾选 → 删除钮计数联动；再点取消；a11y selected 同步', () => {
    const { getByTestId, getByText, getAllByLabelText } = render(<OrdersPage />, { wrapper });
    fireEvent.press(getByTestId('orders-manage'));
    // Why: 勾选热区是卡片内 header Pressable（整卡两处 Pressable 均走 onPress 分流），
    //      外层 View 无手势 handler；两卡同 label → getAllByLabelText[0] 即 o1
    fireEvent.press(getAllByLabelText('order.cardHeaderA11y')[0]);
    expect(getByText('order.selectedTitle:1')).toBeTruthy();
    expect(getByText('common.delete (1)')).toBeTruthy();
    expect(getByTestId('order-card-o1').props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(getAllByLabelText('order.cardHeaderA11y')[0]);
    expect(getByText('common.delete (0)')).toBeTruthy();
  });

  it('C1：勾选后删除 → Native Alert 二次确认弹出（确认回调才 mutate）', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    try {
      const { getByTestId, getAllByLabelText } = render(<OrdersPage />, { wrapper });
      fireEvent.press(getByTestId('orders-manage'));
      fireEvent.press(getAllByLabelText('order.cardHeaderA11y')[0]);
      fireEvent.press(getByTestId('orders-batch-delete'));
      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(mockDeleteMutate).not.toHaveBeenCalled();
      alertSpy.mock.calls[0][2]?.[1].onPress?.();
      expect(mockDeleteMutate).toHaveBeenCalledWith(['o1'], expect.anything());
    } finally {
      alertSpy.mockRestore();
    }
  });

  it('C1：未勾选（0 项）删除钮 disabled', () => {
    const { getByTestId } = render(<OrdersPage />, { wrapper });
    fireEvent.press(getByTestId('orders-manage'));
    expect(getByTestId('orders-batch-delete').props.accessibilityState).toEqual({ disabled: true });
  });

  it('C1：全选 → 两单勾选（删除 (2)）；再点取消全选', () => {
    const { getByTestId, getByText } = render(<OrdersPage />, { wrapper });
    fireEvent.press(getByTestId('orders-manage'));
    fireEvent.press(getByText('common.selectAll'));
    expect(getByText('order.selectedTitle:2')).toBeTruthy();
    expect(getByText('common.delete (2)')).toBeTruthy();
    fireEvent.press(getByText('common.selectAll'));
    expect(getByText('common.delete (0)')).toBeTruthy();
  });

  it('C2：离线时点删除 → 阻止（不弹 Alert 不 mutate）', () => {
    mockIsOffline = true;
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId, getAllByLabelText } = render(<OrdersPage />, { wrapper });
    fireEvent.press(getByTestId('orders-manage'));
    fireEvent.press(getAllByLabelText('order.cardHeaderA11y')[0]);
    fireEvent.press(getByTestId('orders-batch-delete'));
    expect(toast.error).toHaveBeenCalledWith('common.youAreOffline');
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockDeleteMutate).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  // 批3 审查 P2-1：管理模式下当前 tab 订单删空 → 空态与管理栏并存怪异，自动退出管理模式
  it('P2-1：管理模式下列表删空（orders 为空）→ 自动退出管理模式（管理栏消失、标题复原）', () => {
    const { getByTestId, queryByTestId, rerender } = render(<OrdersPage />, { wrapper });
    fireEvent.press(getByTestId('orders-manage'));
    expect(getByTestId('orders-batch-delete')).toBeTruthy();
    // 模拟删除后列表清空（rerender 驱动 mock 数据变化 + useEffect 触发）
    mockOrders = [];
    rerender(<OrdersPage />);
    expect(queryByTestId('orders-batch-delete')).toBeNull();
    expect(queryByTestId('orders-exit-select')).toBeNull();
    expect(getByTestId('orders-manage')).toBeTruthy();
  });
});
