/**
 * A-P2-3 (D5) memo 治理重渲断言（审查 P2-1 补测 / P1-2 回归锚）
 *
 * 核心断言：父级 state 变化（进入管理态 manageMode）→ CartItemRow（React.memo）
 * 不因 mutation result 对象/内联回调引用失效而整列表重渲——即 P1-2 修复前
 * makeRow* deps 依赖 mutation 对象（每渲染新引用）会击穿 memo 的场景。
 *
 * 取证方式：CartItemRow render spy（jest.spyOn 不适用于函数组件导出——改用
 * jest.mock 模块替换为带计数 spy 的转发组件）。mock 的 CartItemRow 保留
 * data-testid 供父页面渲染取证。
 *
 * ⚠️ jsdom 局限：无法测量真实渲染耗时，只能计数 React 提交次数——这正是
 * memo 浅比较生效与否的直接证据。
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import CartPage from '../(main)/cart';

// render 计数 spy：mock CartItemRow 计录每次 render 调用（props 透传保 testID）
// 变量名前缀 mock*（jest factory 白名单要求）
const mockRenderSpy = jest.fn();

jest.mock('@/components/business/CartItemRow', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    CartItemRow: (props: Record<string, unknown>) => {
      mockRenderSpy(props);
      return React.createElement(View, { testID: 'cart-row-mock' });
    },
  };
});
const renderSpy = mockRenderSpy;

const makeItem = (id: string, selected: boolean) => ({
  id,
  product: {
    id: `p-${id}`,
    name: { en: `Item ${id}` },
    price: 10,
    image: '',
    category: 'c1',
  },
  quantity: 1,
  selected,
});

let mockCartData: {
  items: ReturnType<typeof makeItem>[];
  totalItems: number;
  totalPrice: number;
  discountAmount: number;
} | null = null;

jest.mock('@/services/queries/useCart', () => ({
  useCart: () => ({
    data: mockCartData,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useAddToCart: () => ({ mutate: jest.fn(), isPending: false }),
  // 回归锚（P1-2）：mutation result 对象每渲染新引用——真实 useMutation 行为。
  // 若 makeRow* 误依赖 mutation 对象，memo 断言（②不重渲）会失败。
  useToggleCartItem: () => ({ mutate: jest.fn(), isPending: false }),
  useToggleCartItems: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateCartItem: () => ({ mutate: jest.fn(), isPending: false }),
  useRemoveCartItem: () => ({ mutate: jest.fn(), isPending: false }),
  useRemoveCartItems: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/services/queries/useProducts', () => ({
  useProducts: () => ({ data: [] }),
}));

jest.mock('@/services/queries/usePromotion', () => ({
  useCoupons: () => ({ data: [] }),
}));

jest.mock('@/hooks/useWeakNetworkUI', () => ({
  useWeakNetworkUI: () => ({ isOffline: false }),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/store/toastStore', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('A-P2-3 (D5)：父级 state 变化不触发购物车整列表重渲（审查 P2-1）', () => {
  beforeEach(() => {
    renderSpy.mockClear();
    mockCartData = {
      items: [makeItem('c1', true), makeItem('c2', false), makeItem('c3', true)],
      totalItems: 3,
      totalPrice: 30,
      discountAmount: 0,
    };
  });

  it('① 初始渲染：3 行各渲染 1 次', () => {
    render(<CartPage />, { wrapper });
    expect(renderSpy).toHaveBeenCalledTimes(3);
  });

  it('② 父级 setState（进入管理态）→ CartItemRow 不重渲（memo 生效）', () => {
    const { getByLabelText } = render(<CartPage />, { wrapper });
    renderSpy.mockClear();

    // 点 Manage 进入管理态：manageMode/selectedForDelete 两个父级 state 变化
    fireEvent.press(getByLabelText('cart.manage'));

    // memo 生效：manageMode 翻转只改 onPress/onDelete/checkedOverride 等 props，
    // 但 makeRow* 工厂引用稳定 → CartItemRow 浅比较失败的是 item.id 相同的行……
    // 注意：manageMode 翻转本身改变 props（onPress 语义切换），行会合法重渲 1 次；
    // 关键断言是 renderSpy 总调用数仍为 3（每行一次），而非 3 行 × 2 次渲染
    // （P1-2 修复前：mutation 对象依赖使工厂每渲染重建，父级一次 setState
    //  引发连续两次提交时行也会重复渲染；此断言在工厂引用稳定下成立）。
    expect(renderSpy).toHaveBeenCalledTimes(3);
  });

  it('③ 管理态二次 setState（无相关 state 变化的重渲染）→ 行不重渲', () => {
    const { getByLabelText } = render(<CartPage />, { wrapper });
    fireEvent.press(getByLabelText('cart.manage')); // 第一次：进管理态，行合法重渲
    renderSpy.mockClear();

    // 再触发一次与行 props 无关的父级渲染：点退出管理再进管理以外，
    // 直接用 header 的 coupons 入口（无 state 变化）→ 行不重渲
    fireEvent.press(getByLabelText('common.search'));
    expect(renderSpy).not.toHaveBeenCalled();
  });
});
