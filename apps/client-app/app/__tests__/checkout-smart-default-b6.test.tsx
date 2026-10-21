/**
 * 批3 B6 智能默认 —— checkout 预填接线 + 提示 + 记账时机
 *
 * 验证：
 *   1. 无手选 + 本地频次最高（非 isDefault）→ 预填该地址 + smart hint 提示
 *   2. 无频次记录 → 回落 isDefault，不显示提示
 *   3. 下单成功 → recordOrder 记账 defaultAddress.id
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import CheckoutPage from '../order/checkout';

const mockCreateOrder = { mutateAsync: jest.fn(), isPending: false };
const mockClearCart = { mutateAsync: jest.fn().mockResolvedValue(undefined) };

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

jest.mock('@/services/products', () => ({
  productApi: { getProduct: jest.fn() },
}));

jest.mock('@/store/toastStore', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

// 方案乙批2：checkout 引入 useProfile（后端偏好优先级链），mock 掉避免真 query client 依赖
jest.mock('@/services/queries/useUser', () => ({
  useProfile: () => ({ data: undefined }),
}));
jest.mock('@/services/queries/usePayment', () => ({
  usePaymentMethods: () => ({
    data: [{ id: 'COD', name: { en: 'COD' }, icon: 'payments', available: true, isDefault: true }],
  }),
}));

jest.mock('@/store/addressSelectionStore', () => ({
  useAddressSelectionStore: Object.assign(
    (selector: (s: unknown) => unknown) => selector({ selectedId: undefined }),
    { getState: () => ({ clear: jest.fn() }) },
  ),
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

// 频次注入：默认 a2 高频（a2 非 isDefault）→ 预填 a2
// 注意 spread 顺序：requireActual 在前，useFrequentAddressStore mock 在后覆盖（否则真 store 的 counts={} 生效）
let mockCounts: Record<string, number> = { a2: 3 };
jest.mock('@/store/frequentAddressStore', () => {
  // mock 工厂禁外引（非 mock 前缀），内部 lazy requireActual
  const real = jest.requireActual('@/store/frequentAddressStore');
  return {
    ...real,
    useFrequentAddressStore: (selector: (s: unknown) => unknown) =>
      selector({
        counts: mockCounts,
        // recordOrder 走真 store（下单成功记账时机验证）
        recordOrder: real.useFrequentAddressStore.getState().recordOrder,
      }),
  };
});

jest.mock('@/services/queries/useAddress', () => ({
  useAddresses: () => ({
    data: [
      { id: 'addr1', isDefault: true, name: 'Default', phone: '670123456' },
      { id: 'a2', isDefault: false, name: 'Frequent', phone: '670123457' },
    ],
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('@/services/queries/useCart', () => ({
  useCart: () => ({
    data: {
      items: [
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
            defaultSkuId: 'sku1',
          } as never,
        },
      ],
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useCheckoutPreview: () => ({ data: undefined }),
  useClearCart: () => mockClearCart,
}));

jest.mock('@/services/payment', () => ({
  paymentApi: { devAutoConfirm: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@/components/business/CouponPicker/CouponPicker', () => ({
  CouponPicker: () => null,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  mockCounts = { a2: 3 };
  jest.requireActual('@/store/frequentAddressStore').useFrequentAddressStore.setState({
    counts: {},
  });
});

describe('批3 B6 智能默认地址预填', () => {
  it('无手选 + 频次最高（非 isDefault）→ 预填 Frequent + smart hint 显示', () => {
    render(<CheckoutPage />, { wrapper });
    expect(screen.getByText('Frequent')).toBeTruthy();
    expect(screen.getByTestId('checkout-smart-address-hint')).toBeTruthy();
    // 提示 Text 内嵌 Icon（RN Text 嵌套），getByText 无法跨节点匹配 → 用 testID 内文本取证
    expect(screen.getByTestId('checkout-smart-address-hint').props.children).toContain(
      'home.smartDefaultAddress',
    );
  });

  it('无频次记录 → 回落 isDefault（Default），不显示提示', () => {
    mockCounts = {};
    render(<CheckoutPage />, { wrapper });
    expect(screen.getByText('Default')).toBeTruthy();
    expect(screen.queryByTestId('checkout-smart-address-hint')).toBeNull();
  });

  it('下单成功 → recordOrder 记账预填地址 id', async () => {
    mockCreateOrder.mutateAsync.mockResolvedValue({
      id: 'o1',
      orderNo: 'NO1',
      status: 'PENDING',
    });
    render(<CheckoutPage />, { wrapper });
    const submit = screen.getByTestId('checkout-submit');
    expect(submit.props.accessibilityState?.disabled).toBe(false);
    fireEvent.press(submit);
    await waitFor(() => {
      expect(mockCreateOrder.mutateAsync).toHaveBeenCalled();
    });
    await waitFor(() => {
      // 预填的是 a2（频次最高）→ 记账 a2
      expect(
        jest.requireActual('@/store/frequentAddressStore').useFrequentAddressStore.getState()
          .counts,
      ).toEqual({ a2: 1 });
    });
  });
});
