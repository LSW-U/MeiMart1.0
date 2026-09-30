/**
 * C-P1-1 结算页支付方式回填 + 无选中禁止提交（审查修复批1）
 *
 * 复用 checkout-reservation-badge.test.tsx 的四层 mock 模式（usePaymentMethods 返回值
 * 由用例注入）。覆盖报告 §5 A1 两用例 + 默认项逻辑：
 * 1. 支付方式异步到达后自动选中默认项（isDefault 优先）
 * 2. 无 isDefault 时选首项
 * 3. 未选中时提交按钮 disabled（不静默回退 COD）
 * 4. 用户已手选后列表就绪不覆盖手选
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import CheckoutPage from '../order/checkout';

const mockUsePaymentMethods = jest.fn();
const mockCreateOrder = { mutateAsync: jest.fn(), isPending: false };
// P2-1（批4 修复）：购物车 items 可注入（jest.mock 工厂引用外部变量须以 mockCartItems 命名，jest 允许）
let mockCartItems: Record<string, unknown>[] = [
  {
    id: 'ci1',
    selected: true,
    quantity: 1,
    product: { id: 'p001', price: 25.9, name: { en: 'Apple' }, image: '', category: '' },
  },
];

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}) as Record<string, string>,
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

jest.mock('@/hooks/useWeakNetworkUI', () => ({
  useWeakNetworkUI: () => ({ isOffline: false }),
}));

jest.mock('@/services/api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
  isMockMode: false,
}));

jest.mock('@/services/mockDb', () => ({
  mockDb: { payments: [], orders: [] },
  mockResponse: async (value: unknown) => value,
}));

jest.mock('@/services/queries/useCart', () => ({
  // items 带一条已选商品，保证提交按钮不被 selectedItems.length===0 禁用；
  // P2-1（批4 修复）：改读外部变量 mockCartItems，个别用例可注入带 defaultSkuId 的 fixture
  useCart: () => ({
    data: { items: mockCartItems },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useCheckoutPreview: () => ({ data: undefined }),
  useClearCart: () => ({ mutateAsync: jest.fn() }),
}));

// 批3 转办①：defaultSkuId 缺失兜底链路的注入点（个别用例改写此返回值）
const mockGetProduct = jest.fn();
jest.mock('@/services/products', () => ({
  productApi: { getProduct: (...args: unknown[]) => mockGetProduct(...args) },
}));

jest.mock('@/store/toastStore', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

jest.mock('@/services/queries/usePayment', () => ({
  usePaymentMethods: (...args: unknown[]) => mockUsePaymentMethods(...args),
}));

jest.mock('@/store/addressSelectionStore', () => ({
  useAddressSelectionStore: (selector: (s: unknown) => unknown) =>
    selector({ selectedId: undefined }),
  resolveCheckoutAddress: () => ({ id: 'addr1', phone: '670123456' }),
}));

jest.mock('@/services/queries/usePromotion', () => ({
  useCoupons: () => ({ data: [] }),
}));

jest.mock('@/services/queries/useOrders', () => ({
  useCreateOrder: () => mockCreateOrder,
  useOrder: () => ({ data: undefined }),
  useCancelOrder: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/services/queries/useAddress', () => ({
  useAddresses: () => ({
    data: [{ id: 'addr1', isDefault: true, name: 'A', phone: '670123456' }],
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('@/components/business/CouponPicker/CouponPicker', () => ({
  CouponPicker: () => null,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const COD = { id: 'COD', name: { en: 'Cash on Delivery' }, icon: 'payments', available: true };
const QRIS = { id: 'QRIS', name: { en: 'QRIS' }, icon: 'qr_code', available: true };

beforeEach(() => {
  jest.clearAllMocks();
  mockUsePaymentMethods.mockReturnValue({ data: [] });
  // P2-1：恢复默认 fixture（前序用例注入的 defaultSkuId 变体不外泄）
  mockCartItems = [
    {
      id: 'ci1',
      selected: true,
      quantity: 1,
      product: { id: 'p001', price: 25.9, name: { en: 'Apple' }, image: '', category: '' },
    },
  ];
});

describe('C-P1-1 结算页支付方式回填 + 无选中禁止提交', () => {
  it('支付方式异步到达后自动选中默认项（isDefault 优先）', async () => {
    mockUsePaymentMethods.mockReturnValue({ data: [COD, { ...QRIS, isDefault: true }] });
    render(<CheckoutPage />, { wrapper });
    const qris = await screen.findByTestId('payment-QRIS', {}, { timeout: 2000 });
    expect(qris.props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('payment-COD').props.accessibilityState.selected).toBe(false);
  });

  it('无 isDefault → 回填首项', async () => {
    mockUsePaymentMethods.mockReturnValue({ data: [COD, QRIS] });
    render(<CheckoutPage />, { wrapper });
    const cod = await screen.findByTestId('payment-COD', {}, { timeout: 2000 });
    expect(cod.props.accessibilityState.selected).toBe(true);
  });

  it('无选中时（支付方式列表为空）提交按钮 disabled，不静默回退 COD', () => {
    mockUsePaymentMethods.mockReturnValue({ data: [] });
    render(<CheckoutPage />, { wrapper });
    // RNTL host 壳：disabled 经 accessibilityState.disabled 透出
    const submit = screen.getByTestId('checkout-submit');
    expect(submit.props.accessibilityState?.disabled).toBe(true);
    expect(mockCreateOrder.mutateAsync).not.toHaveBeenCalled();
  });

  it('支付方式未加载（data undefined）→ 提交 disabled', () => {
    mockUsePaymentMethods.mockReturnValue({ data: undefined });
    render(<CheckoutPage />, { wrapper });
    expect(screen.getByTestId('checkout-submit').props.accessibilityState?.disabled).toBe(true);
  });

  it('列表就绪回填后提交按钮恢复可用', async () => {
    mockUsePaymentMethods.mockReturnValue({ data: [COD] });
    render(<CheckoutPage />, { wrapper });
    await screen.findByTestId('payment-COD', {}, { timeout: 2000 });
    expect(screen.getByTestId('checkout-submit').props.accessibilityState?.disabled).toBe(false);
  });

  // P2-1（批4 修复）：任务书规定的正向断言——购物车项 fixture 带 defaultSkuId →
  // 提交直接透传，不拉详情（getProduct not called）
  it('购物车项带 defaultSkuId → 提交不触发 getProduct 兜底请求', async () => {
    mockUsePaymentMethods.mockReturnValue({ data: [COD] });
    // 给 getProduct 返回值但断言不被调用：若实现误兜底，skuId 会错取 'sku-should-not-be-used'
    mockGetProduct.mockResolvedValue({ id: 'p001', defaultSkuId: 'sku-should-not-be-used' });
    mockCartItems = [
      {
        id: 'ci1',
        selected: true,
        quantity: 1,
        product: {
          id: 'p001',
          price: 25.9,
          name: { en: 'Apple' },
          image: '',
          category: '',
          defaultSkuId: 'sku-from-cart',
        },
      },
    ];
    render(<CheckoutPage />, { wrapper });
    const submitBtn = await screen.findByTestId('checkout-submit', {}, { timeout: 2000 });
    fireEvent.press(submitBtn);
    await waitFor(() => expect(mockCreateOrder.mutateAsync).toHaveBeenCalledTimes(1));
    expect(mockCreateOrder.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [{ skuId: 'sku-from-cart', quantity: 1 }],
      }),
    );
    expect(mockGetProduct).not.toHaveBeenCalled();
  });

  // P2-1（批4 修复）：改名保留——本用例实际测的是兜底路径本身（fixture 不带 defaultSkuId）
  it('购物车项无 defaultSkuId/skuId → 兜底查详情 getProduct 取 skuId 提交', async () => {
    mockUsePaymentMethods.mockReturnValue({ data: [COD] });
    mockGetProduct.mockResolvedValue({ id: 'p001', defaultSkuId: 'sku-from-detail' });
    render(<CheckoutPage />, { wrapper });
    const submitBtn = await screen.findByTestId('checkout-submit', {}, { timeout: 2000 });
    expect(submitBtn.props.accessibilityState?.disabled).toBe(false);
    fireEvent.press(submitBtn);
    await waitFor(() => expect(mockCreateOrder.mutateAsync).toHaveBeenCalledTimes(1));
    // skuId 来自详情兜底返回
    expect(mockCreateOrder.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [{ skuId: 'sku-from-detail', quantity: 1 }],
      }),
    );
    expect(mockGetProduct).toHaveBeenCalledWith('p001');
  });

  it('购物车项 skuId 缺失且详情也无 defaultSkuId → 不调用 createOrder（NO_SKU 守卫）', async () => {
    mockUsePaymentMethods.mockReturnValue({ data: [COD] });
    mockGetProduct.mockResolvedValue({ id: 'p001', defaultSkuId: null });
    render(<CheckoutPage />, { wrapper });
    const submitBtn = await screen.findByTestId('checkout-submit', {}, { timeout: 2000 });
    fireEvent.press(submitBtn);
    await waitFor(() => expect(mockGetProduct).toHaveBeenCalled());
    expect(mockCreateOrder.mutateAsync).not.toHaveBeenCalled();
  });
});
