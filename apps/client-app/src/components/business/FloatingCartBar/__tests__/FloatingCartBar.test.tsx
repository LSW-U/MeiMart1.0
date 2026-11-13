import React, { act, createRef } from 'react';
import { Alert, View } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { ThemeProvider } from '@/theme';
// 20261111 分类页悬浮购物车条：三态（空车隐藏/有货显示合计+结算/点击触发）
// 20261112 v2 全宽贴底条 + 叠头像预览 + 点击弹面板（去购物车跳转收进面板）
import { FloatingCartBar } from '../FloatingCartBar';
import type { FloatingCartBarRef } from '../FloatingCartBar.types';
import type { Cart, CartItem } from '@/types';

// 同 BottomNav 测试先例：t 返 key 本身，断言走 key 而非译文（文案对账由 check-i18n 保证）
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

jest.mock('@/services/queries/useCart', () => ({
  useCart: jest.fn(),
  useCheckoutPreview: jest.fn(),
  useUpdateCartItem: jest.fn(),
  useRemoveCartItem: jest.fn(),
}));

// mutate 引用钉在模块级（hook 每次渲染重调，results[0] 取不到当前实例）
const mockUpdateMutate = jest.fn();
const mockRemoveMutate = jest.fn();
beforeEach(() => {
  jest
    .requireMock('@/services/queries/useCart')
    .useUpdateCartItem.mockReturnValue({ mutate: mockUpdateMutate });
  jest
    .requireMock('@/services/queries/useCart')
    .useRemoveCartItem.mockReturnValue({ mutate: mockRemoveMutate });
});

// 20261113 PanelRow 行跳详情用 useRouter().push —— 测试环境无 expo-router 上下文，mock 掉
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/services/queries/useAddress', () => ({
  useAddresses: jest.fn(),
}));

const mockUseCart = jest.requireMock('@/services/queries/useCart').useCart as jest.Mock;
const mockUsePreview = jest.requireMock('@/services/queries/useCart')
  .useCheckoutPreview as jest.Mock;
const mockUseAddresses = jest.requireMock('@/services/queries/useAddress')
  .useAddresses as jest.Mock;

// useTheme 组件需 ThemeProvider 包裹（同 CartIconButton 测试先例）
const renderWithTheme = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

// 20261112 方案 A 后开面板是「先 measureInWindow 回调里再 setPanelOpen」的两步——
// RN 测试环境下 View.measureInWindow 存在但回调**从不触发**（探针实证），面板永远开不了。
// 补丁：给 View.prototype 打一个同步回调的假实现（返回固定坐标，视口 800 高 → bottom=650）。
// 本测试只关心「回调后面板开合/内容」逻辑，坐标真值由真机人工验收兜底
beforeAll(() => {
  (View.prototype as unknown as Record<string, unknown>).measureInWindow = function (
    this: unknown,
    callback: (x: number, y: number, w: number, h: number) => void,
  ) {
    void this;
    callback(0, 100, 300, 50);
  };
});

// 20261112 方案 A 后开面板是「先 measureInWindow 回调里再 setPanelOpen」的两步
// （回调经 beforeAll 的同步假实现），用本助手统一 press→面板开落定再断言
const openPanel = (pressable: ReactTestInstance) => {
  act(() => {
    fireEvent.press(pressable);
  });
};

const makeItem = (
  id: string,
  name: string,
  price: number,
  qty: number,
  selected = true,
): CartItem => ({
  id,
  product: { id, name, price, image: `https://img/${id}.png`, category: 'cat-1' },
  quantity: qty,
  selected,
});

const makeCart = (items: CartItem[]): Cart => {
  const sel = items.filter((i) => i.selected);
  return {
    items,
    totalItems: sel.reduce((s, i) => s + i.quantity, 0),
    totalPrice: sel.reduce((s, i) => s + i.product.price * i.quantity, 0),
  };
};

describe('FloatingCartBar', () => {
  beforeEach(() => {
    mockUseCart.mockReturnValue({ data: null });
    // 明细卡默认隐藏（preview 空）——需要明细的场景单独 mock
    mockUsePreview.mockReturnValue({ data: null });
    mockUseAddresses.mockReturnValue({ data: [] });
  });

  it('空车（totalItems=0）不渲染', () => {
    mockUseCart.mockReturnValue({ data: { items: [], totalItems: 0, totalPrice: 0 } });
    const { queryByTestId } = renderWithTheme(<FloatingCartBar testID="fcb" />);
    expect(queryByTestId('fcb')).toBeNull();
  });

  it('有商品：渲染件数角标 + 合计金额 + 结算按钮', () => {
    mockUseCart.mockReturnValue({
      data: { items: [makeItem('p1', 'Rice', 19.9, 3)], totalItems: 3, totalPrice: 59.7 },
    });
    const { getByTestId, getByText } = renderWithTheme(<FloatingCartBar testID="fcb" />);
    expect(getByTestId('fcb')).toBeTruthy();
    expect(getByText('3')).toBeTruthy(); // Badge count
    expect(getByText('cart.total')).toBeTruthy();
    expect(getByText('cart.checkout')).toBeTruthy();
  });

  it('点条身开面板（icon 以外区域，不触发 onPress）', async () => {
    mockUseCart.mockReturnValue({ data: makeCart([makeItem('p1', 'Rice', 15, 2)]) });
    const onPress = jest.fn();
    const { getByTestId, queryByText } = renderWithTheme(
      <FloatingCartBar testID="fcb" onPress={onPress} />,
    );
    await openPanel(getByTestId('fcb-bar'));
    expect(onPress).not.toHaveBeenCalled(); // v2 拍板：跳转收进面板「去购物车」
    expect(queryByText('cart.selectedPreview')).toBeTruthy();
  });

  it('props 注入覆盖 useCart 值（测试钩子）', () => {
    mockUseCart.mockReturnValue({ data: { items: [], totalItems: 9, totalPrice: 99 } });
    const { getByText } = renderWithTheme(<FloatingCartBar count={5} total={42} />);
    expect(getByText('5')).toBeTruthy();
  });

  it('叠头像预览：选中前 2 张 + 溢出 +N；未选中不进预览（20261113 拍板 2 张省空间）', () => {
    mockUseCart.mockReturnValue({
      data: makeCart([
        makeItem('a', 'A', 1, 1),
        makeItem('b', 'B', 1, 1),
        makeItem('c', 'C', 1, 1),
        makeItem('d', 'D', 1, 1),
        makeItem('e', 'E', 1, 1, false), // 未选中：排除
      ]),
    });
    const { getByTestId, queryByText, queryByTestId } = renderWithTheme(
      <FloatingCartBar testID="fcb" />,
    );
    expect(getByTestId('fcb-preview-0')).toBeTruthy();
    expect(getByTestId('fcb-preview-1')).toBeTruthy();
    expect(queryByTestId('fcb-preview-2')).toBeNull(); // 只渲 2 张
    expect(queryByText('+2')).toBeTruthy(); // 4 选中 - 2 = +2
  });

  it('面板：展示全量选中商品（名/×数量/小计），点面板外遮罩收回（X 已取消）', async () => {
    mockUseCart.mockReturnValue({
      data: makeCart([makeItem('a', 'Apple', 3, 2), makeItem('b', 'Banana', 4, 1)]),
    });
    const { getByTestId, getByText, queryByText } = renderWithTheme(
      <FloatingCartBar testID="fcb" />,
    );
    await openPanel(getByTestId('fcb-bar'));
    expect(getByText('Apple')).toBeTruthy();
    expect(getByText('Banana')).toBeTruthy();
    // 20261113 面板行改 −/+ 步进器：数量以数字节点渲染（原 ×2 文本已废）
    expect(getByText('2')).toBeTruthy();
    expect(getByText('$6.00')).toBeTruthy(); // 3×2 小计（formatPrice en locale）
    // 20261112 拍板：X 取消，点面板外任意处（遮罩）收回
    fireEvent.press(getByTestId('fcb-backdrop'));
    expect(queryByText('cart.selectedPreview')).toBeNull();
  });

  it('方案 C：ref.dismissPanel() 收面板；面板未开时调用 no-op 不报错', async () => {
    mockUseCart.mockReturnValue({ data: makeCart([makeItem('a', 'Apple', 3, 2)]) });
    const ref = createRef<FloatingCartBarRef>();
    const { getByTestId, queryByText } = renderWithTheme(
      <FloatingCartBar ref={ref} testID="fcb" />,
    );
    // 未开面板时调用：no-op（页面 onScroll 高频触发，不可报错）
    ref.current?.dismissPanel();
    expect(queryByText('cart.selectedPreview')).toBeNull();
    // 开面板后调用：收回（state 更新包裹 act——ref 调用不在 fireEvent 内）
    await openPanel(getByTestId('fcb-bar'));
    expect(queryByText('cart.selectedPreview')).toBeTruthy();
    act(() => {
      ref.current?.dismissPanel();
    });
    expect(queryByText('cart.selectedPreview')).toBeNull();
  });

  it('合计区箭头钮：开面板 expand_less→expand_more，点箭头也能关面板（20261212 入口可感知化）', async () => {
    mockUseCart.mockReturnValue({ data: makeCart([makeItem('a', 'Apple', 3, 2)]) });
    const { getByTestId, queryByText } = renderWithTheme(<FloatingCartBar testID="fcb" />);
    // 关态箭头存在（expand_less 经 iconMapping 渲染为 chevron-up 的 Icon，以热区 testID 取证）
    expect(getByTestId('fcb-total-toggle')).toBeTruthy();
    expect(queryByText('cart.selectedPreview')).toBeNull();
    await openPanel(getByTestId('fcb-total-toggle'));
    expect(queryByText('cart.selectedPreview')).toBeTruthy(); // 开面板
    // 开面板后整棵树在 Modal 内重新渲染，重新取 toggle 热区再点收起（act 包裹 state 更新）
    act(() => {
      fireEvent.press(getByTestId('fcb-total-toggle'));
    });
    expect(queryByText('cart.selectedPreview')).toBeNull(); // 再点收起
  });

  it('购物车 icon 点击：直达购物车（onPress）并收起面板（20261112 拍板，原「去购物车」按钮取消）', async () => {
    mockUseCart.mockReturnValue({ data: makeCart([makeItem('a', 'Apple', 3, 2)]) });
    const onPress = jest.fn();
    const { getByTestId, queryByText } = renderWithTheme(
      <FloatingCartBar testID="fcb" onPress={onPress} />,
    );
    await openPanel(getByTestId('fcb-bar'));
    expect(queryByText('cart.selectedPreview')).toBeTruthy(); // 面板先开着
    fireEvent.press(getByTestId('fcb-cart-jump'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(queryByText('cart.selectedPreview')).toBeNull(); // 跳转前收面板
  });
  it('明细卡：preview 加载后显示 折扣/运费/预计实付（免运费绿字）', async () => {
    mockUseCart.mockReturnValue({ data: makeCart([makeItem('a', 'Apple', 3, 2)]) });
    mockUseAddresses.mockReturnValue({
      data: [{ id: 'addr1', isDefault: true }],
    });
    mockUsePreview.mockReturnValue({
      data: {
        itemsSubtotal: 6,
        deliveryFee: 0,
        discount: 1.5,
        payableAmount: 4.5,
        estimatedDeliveryTime: '2026-11-12T18:00:00Z',
      },
    });
    const { getByTestId, getByText } = renderWithTheme(<FloatingCartBar testID="fcb" />);
    await openPanel(getByTestId('fcb-bar'));
    expect(getByTestId('fcb-summary')).toBeTruthy();
    expect(getByText('cart.discountLabel')).toBeTruthy();
    expect(getByText('-$1.50')).toBeTruthy();
    expect(getByText('cart.freeDelivery')).toBeTruthy(); // deliveryFee=0 走免运费文案
    expect(getByText('cart.estimatedPayable')).toBeTruthy();
    expect(getByText('$4.50')).toBeTruthy();
  });

  it('明细卡：无默认地址/preview 未加载整卡隐藏（弱网降级）', async () => {
    mockUseCart.mockReturnValue({ data: makeCart([makeItem('a', 'Apple', 3, 2)]) });
    mockUseAddresses.mockReturnValue({ data: [] }); // 无地址
    const { getByTestId, queryByTestId } = renderWithTheme(<FloatingCartBar testID="fcb" />);
    await openPanel(getByTestId('fcb-bar'));
    expect(queryByTestId('fcb-summary')).toBeNull();
  });

  // 20261113 面板行交互批：跳详情 + 步进器（乐观更新 mutation 注入断言）
  it('面板行：点图/品名跳详情并收面板（router.push /product/[id]）', async () => {
    mockUseCart.mockReturnValue({ data: makeCart([makeItem('a', 'Apple', 3, 2)]) });
    const mockPushRef = mockPush;
    const { getByTestId, getByText, queryByText } = renderWithTheme(
      <FloatingCartBar testID="fcb" />,
    );
    await openPanel(getByTestId('fcb-bar'));
    fireEvent.press(getByText('Apple'));
    expect(mockPushRef).toHaveBeenCalledWith('/product/a');
    expect(queryByText('cart.selectedPreview')).toBeNull(); // 跳前收面板
  });

  it('面板行：+ 触发 useUpdateCartItem quantity+1；− 触发 quantity-1', async () => {
    mockUseCart.mockReturnValue({ data: makeCart([makeItem('a', 'Apple', 3, 2)]) });
    const { getByTestId } = renderWithTheme(<FloatingCartBar testID="fcb" />);
    await openPanel(getByTestId('fcb-bar'));
    fireEvent.press(getByTestId('fcb-qty-plus-a'));
    expect(mockUpdateMutate).toHaveBeenCalledWith({ itemId: 'a', updates: { quantity: 3 } });
    fireEvent.press(getByTestId('fcb-qty-minus-a'));
    expect(mockUpdateMutate).toHaveBeenCalledWith({ itemId: 'a', updates: { quantity: 1 } });
  });

  it('面板行：数量 1 时按 − 弹 Alert 确认，确认后调 useRemoveCartItem', async () => {
    mockUseCart.mockReturnValue({ data: makeCart([makeItem('a', 'Apple', 3, 1)]) });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    try {
      const { getByTestId } = renderWithTheme(<FloatingCartBar testID="fcb" />);
      await openPanel(getByTestId('fcb-bar'));
      fireEvent.press(getByTestId('fcb-qty-minus-a')); // −（qty=1）
      expect(alertSpy).toHaveBeenCalled();
      // Alert 回调按钮第 2 个是「删除」（cancel 在前），模拟用户确认
      const confirmBtn = alertSpy.mock.calls[0][2]?.[1];
      act(() => confirmBtn?.onPress?.());
      expect(mockRemoveMutate).toHaveBeenCalledWith('a');
    } finally {
      alertSpy.mockRestore();
    }
  });
});
