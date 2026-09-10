/**
 * 批D D2 — 结算页预约单标注（acceptingReservation/nextOpenAt，保证金批A T5-c）
 *
 * 覆盖（方案v2 §2.4 批D 单测下限：预约标注 ×1 + 分支覆盖）：
 * 1. acceptingReservation=true + nextOpenAt → 渲染 checkout.acceptingReservation 标注（testID）
 * 2. acceptingReservation=false（营业中）→ 不渲染标注，ETA 行照常
 * 3. 预约态下 ETA 行隐藏（二者互斥，避免同时展示"预计送达"与"接受预约"）
 * 4. preview.warehouseMatch=null → 不渲染标注
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import CheckoutPage from '../order/checkout';
import type { PreviewResponse } from './checkout-preview-fixtures';

// ===== mocks（对齐 payment-methods-batch-b.test.tsx 模式）=====
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}) as Record<string, string>,
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    // t 返回 key 本身，便于断言具体 key
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

jest.mock('@/services/queries/usePayment', () => ({
  usePaymentMethods: () => ({ data: [] }),
}));

jest.mock('@/store/addressSelectionStore', () => ({
  useAddressSelectionStore: (selector: (s: unknown) => unknown) =>
    selector({ selectedId: undefined }),
  resolveCheckoutAddress: () => undefined,
}));

jest.mock('@/services/queries/usePromotion', () => ({
  useCoupons: () => ({ data: [] }),
}));

jest.mock('@/services/queries/useOrders', () => ({
  useCreateOrder: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useOrder: () => ({ data: undefined }),
  useCancelOrder: () => ({ mutate: jest.fn(), isPending: false }),
}));

// Why: useCheckoutPreview 返回值由用例注入（预约态/营业态/null）
const mockPreview = jest.fn();
jest.mock('@/services/queries/useCart', () => ({
  useCart: () => ({ data: { items: [] }, isLoading: false, isError: false, refetch: jest.fn() }),
  useCheckoutPreview: (...args: unknown[]) => mockPreview(...args),
  useClearCart: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock('@/services/queries/useAddress', () => ({
  useAddresses: () => ({ data: [], isLoading: false, isError: false }),
}));

jest.mock('@/components/business/CouponPicker/CouponPicker', () => ({
  CouponPicker: () => null,
}));

jest.mock('@/components/cultural/TaisDivider', () => ({
  TaisDivider: () => null,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const basePreview = (warehouseMatch: PreviewResponse['warehouseMatch']): PreviewResponse => ({
  items: [],
  warehouseMatch,
  itemsSubtotal: 1000,
  deliveryFee: 0,
  payableAmount: 1000,
  discount: 0,
  couponCode: null,
  couponValid: false,
  warnings: [],
  estimatedDeliveryTime: new Date('2026-09-11T10:00:00Z').toISOString(),
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('结算页预约单标注（批D D2）', () => {
  it('acceptingReservation=true → 渲染 checkout.acceptingReservation 标注', () => {
    mockPreview.mockReturnValue({
      data: basePreview({
        id: 'wh-1',
        code: 'DILI-01',
        deliveryFee: 0,
        acceptingReservation: true,
        nextOpenAt: '2026-09-12T02:00:00.000Z',
      }),
    });
    render(<CheckoutPage />, { wrapper });
    expect(screen.getByTestId('reservation-badge')).toBeTruthy();
    expect(screen.getByText('checkout.acceptingReservation')).toBeTruthy();
  });

  it('预约态下 ETA 行隐藏（互斥展示）', () => {
    mockPreview.mockReturnValue({
      data: basePreview({
        id: 'wh-1',
        code: 'DILI-01',
        deliveryFee: 0,
        acceptingReservation: true,
        nextOpenAt: '2026-09-12T02:00:00.000Z',
      }),
    });
    render(<CheckoutPage />, { wrapper });
    expect(screen.queryByTestId('checkout-eta')).toBeNull();
    expect(screen.queryByText('checkout.estimatedDelivery')).toBeNull();
  });

  it('acceptingReservation=false（营业中）→ 无标注，ETA 照常', () => {
    mockPreview.mockReturnValue({
      data: basePreview({
        id: 'wh-1',
        code: 'DILI-01',
        deliveryFee: 0,
        acceptingReservation: false,
        nextOpenAt: null,
      }),
    });
    render(<CheckoutPage />, { wrapper });
    expect(screen.queryByTestId('reservation-badge')).toBeNull();
    expect(screen.getByTestId('checkout-eta')).toBeTruthy();
    expect(screen.getByText('checkout.estimatedDelivery')).toBeTruthy();
  });

  it('warehouseMatch=null（无匹配仓）→ 无标注（ETA 仍按 estimatedDeliveryTime 展示，与仓库匹配无关）', () => {
    mockPreview.mockReturnValue({ data: basePreview(null) });
    render(<CheckoutPage />, { wrapper });
    expect(screen.queryByTestId('reservation-badge')).toBeNull();
    expect(screen.queryByText('checkout.acceptingReservation')).toBeNull();
  });

  // 批D 审查 P3-2 边界：后端 nextOpenAt 理论可为 null（营业时间数据异常，cart.service ?? null）
  it('acceptingReservation=true && nextOpenAt=null → 标注退泛化文案（acceptingReservationGeneric），ETA 仍隐藏', () => {
    mockPreview.mockReturnValue({
      data: basePreview({
        id: 'wh-1',
        code: 'DILI-01',
        deliveryFee: 0,
        acceptingReservation: true,
        nextOpenAt: null,
      }),
    });
    render(<CheckoutPage />, { wrapper });
    expect(screen.getByTestId('reservation-badge')).toBeTruthy();
    expect(screen.getByText('checkout.acceptingReservationGeneric')).toBeTruthy();
    expect(screen.queryByText('checkout.estimatedDelivery')).toBeNull();
  });
});
