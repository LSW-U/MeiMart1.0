/**
 * 业务增强批1 5.5 — checkout 快速新增地址 Modal
 *
 * 验证：
 *   1. 入口渲染（地址卡下「新增地址」文字链）→ 打开 Modal
 *   2. 智能识别：content_paste 入口 → 粘贴文本 → 解析回填姓名/电话/详情
 *   3. 保存 → useCreateAddress.mutate → onSuccess 自动选中（addressSelectionStore）→ 关 Modal 留在 checkout
 *   4. 表单校验：空提交不触发 mutate
 *   5. 取消分支：关闭 Modal 清空状态
 *   6. 识别不出姓名/电话 → toast 错误
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import CheckoutPage from '../order/checkout';

const mockCreateOrder = { mutateAsync: jest.fn(), isPending: false };
const mockClearCart = { mutateAsync: jest.fn().mockResolvedValue(undefined) };
// useCreateAddress.mutate mock：捕获调用参数 + 可编程 onSuccess 回调
const mockCreateMutate = jest.fn();
let mockCreatedAddress = { id: 'new-addr-1' };

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
  mockDb: { payments: [], orders: [], addresses: [] },
  mockResponse: async (value: unknown) => value,
}));

jest.mock('@/services/products', () => ({
  productApi: { getProduct: jest.fn() },
}));

jest.mock('@/store/toastStore', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

jest.mock('@/services/queries/useUser', () => ({
  useProfile: () => ({ data: undefined }),
}));
jest.mock('@/services/queries/usePayment', () => ({
  usePaymentMethods: () => ({
    data: [{ id: 'COD', name: { en: 'COD' }, icon: 'payments', available: true, isDefault: true }],
  }),
}));

// 地址选中 store：真实 zustand store（断言 select 被调用后 selectedId 落库）
jest.mock('@/services/queries/useAddress', () => ({
  useAddresses: () => ({
    data: [{ id: 'addr1', isDefault: true, name: 'Default', phone: '670123456' }],
    isLoading: false,
    isError: false,
  }),
  useCreateAddress: () => ({ mutate: mockCreateMutate, isPending: false }),
}));

jest.mock('@/services/queries/usePromotion', () => ({
  useCoupons: () => ({ data: [] }),
}));

jest.mock('@/services/queries/useOrders', () => ({
  useCreateOrder: () => mockCreateOrder,
  useOrder: () => ({ data: undefined }),
  useCancelOrder: () => ({ mutate: jest.fn(), isPending: false }),
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
  useToggleCartItems: () => ({ mutate: jest.fn() }),
}));

jest.mock('@/services/payment', () => ({
  paymentApi: { devAutoConfirm: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@/components/business/CouponPicker/CouponPicker', () => ({
  CouponPicker: () => null,
}));

jest.mock('@/store/frequentAddressStore', () => {
  const real = jest.requireActual('@/store/frequentAddressStore');
  return {
    ...real,
    useFrequentAddressStore: (selector: (s: unknown) => unknown) =>
      selector({ counts: {}, recordOrder: real.useFrequentAddressStore.getState().recordOrder }),
  };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateMutate.mockImplementation(
    (_vars: unknown, opts?: { onSuccess?: (a: unknown) => void }) => {
      opts?.onSuccess?.(mockCreatedAddress);
    },
  );
});

describe('业务增强批1 5.5 checkout 快速新增地址', () => {
  it('P2-1 修复：保存失败 → 错误码翻译 toast（response.data.error.code → errors.${code}）', async () => {
    mockCreateMutate.mockImplementation(
      (
        _vars: unknown,
        opts?: { onSuccess?: (a: unknown) => void; onError?: (e: unknown) => void },
      ) => {
        opts?.onError?.({
          response: { data: { error: { code: 'E-ORDER-001', message: 'missing lat/lng' } } },
        });
      },
    );
    const { toast } = require('@/store/toastStore');
    render(<CheckoutPage />, { wrapper });
    fireEvent.press(screen.getByTestId('checkout-add-address-entry'));
    fireEvent.changeText(screen.getByTestId('checkout-address-name'), 'Maria Silva');
    fireEvent.changeText(screen.getByTestId('checkout-address-phone'), '77123456');
    fireEvent.changeText(screen.getByTestId('checkout-address-detail'), 'Rua de Lecidere');
    fireEvent.press(screen.getByTestId('checkout-address-save'));
    // RHF handleSubmit 是 async：onError 在异步链路里触发，断言必须 waitFor 等待
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('errors.E-ORDER-001');
    });
    // 失败后不选中、Modal 不关
    const { useAddressSelectionStore } = jest.requireActual('@/store/addressSelectionStore');
    expect(useAddressSelectionStore.getState().selectedId).toBeNull();
  });

  it('P2-1 修复：失败无错误码 → 回退后端原文/message', async () => {
    mockCreateMutate.mockImplementation(
      (
        _vars: unknown,
        opts?: { onSuccess?: (a: unknown) => void; onError?: (e: unknown) => void },
      ) => {
        opts?.onError?.({ message: 'Network Error' });
      },
    );
    const { toast } = require('@/store/toastStore');
    render(<CheckoutPage />, { wrapper });
    fireEvent.press(screen.getByTestId('checkout-add-address-entry'));
    fireEvent.changeText(screen.getByTestId('checkout-address-name'), 'Maria Silva');
    fireEvent.changeText(screen.getByTestId('checkout-address-phone'), '77123456');
    fireEvent.changeText(screen.getByTestId('checkout-address-detail'), 'Rua de Lecidere');
    fireEvent.press(screen.getByTestId('checkout-address-save'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Network Error');
    });
  });

  it('入口渲染 → 打开 Modal（姓名/电话/详情三字段 + 保存按钮）', () => {
    render(<CheckoutPage />, { wrapper });
    fireEvent.press(screen.getByTestId('checkout-add-address-entry'));
    expect(screen.getByTestId('checkout-address-modal')).toBeTruthy();
    expect(screen.getByTestId('checkout-address-name')).toBeTruthy();
    expect(screen.getByTestId('checkout-address-phone')).toBeTruthy();
    expect(screen.getByTestId('checkout-address-detail')).toBeTruthy();
    expect(screen.getByTestId('checkout-address-save')).toBeTruthy();
  });

  it('智能识别：粘贴文本 → 解析回填姓名/电话/详情', async () => {
    render(<CheckoutPage />, { wrapper });
    fireEvent.press(screen.getByTestId('checkout-add-address-entry'));
    fireEvent.press(screen.getByTestId('checkout-address-smart-entry'));
    fireEvent.changeText(
      screen.getByTestId('checkout-address-smart-input'),
      'Maria Silva, 7712 3456, Rua de Lecidere, Dili',
    );
    fireEvent.press(screen.getByTestId('checkout-address-smart-parse'));
    await waitFor(() => {
      expect(screen.getByTestId('checkout-address-name').props.value).toBe('Maria Silva');
      expect(screen.getByTestId('checkout-address-phone').props.value).toBe('77123456');
    });
  });

  it('识别不出姓名/电话 → toast 错误，不回填', () => {
    render(<CheckoutPage />, { wrapper });
    fireEvent.press(screen.getByTestId('checkout-add-address-entry'));
    fireEvent.press(screen.getByTestId('checkout-address-smart-entry'));
    fireEvent.changeText(screen.getByTestId('checkout-address-smart-input'), '!!!');
    fireEvent.press(screen.getByTestId('checkout-address-smart-parse'));
    const { toast } = require('@/store/toastStore');
    expect(toast.error).toHaveBeenCalledWith('checkout.addressModal.parseFailed');
  });

  it('保存 → mutate 全字段 payload → onSuccess 自动选中 + 关 Modal 留在 checkout', async () => {
    const { useAddressSelectionStore } = jest.requireActual('@/store/addressSelectionStore');
    useAddressSelectionStore.getState().clear();
    render(<CheckoutPage />, { wrapper });
    fireEvent.press(screen.getByTestId('checkout-add-address-entry'));
    fireEvent.changeText(screen.getByTestId('checkout-address-name'), 'Maria Silva');
    fireEvent.changeText(screen.getByTestId('checkout-address-phone'), '77123456');
    fireEvent.changeText(screen.getByTestId('checkout-address-detail'), 'Rua de Lecidere');
    fireEvent.press(screen.getByTestId('checkout-address-save'));
    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalledTimes(1);
    });
    // payload 全集断言（防 payload 拼装漏字段）
    expect(mockCreateMutate.mock.calls[0][0]).toEqual({
      name: 'Maria Silva',
      phone: '77123456',
      province: 'Dili',
      city: 'Dili',
      district: '',
      detail: 'Rua de Lecidere',
      isDefault: false,
    });
    // 自动选中新地址（addressSelectionStore）
    await waitFor(() => {
      expect(useAddressSelectionStore.getState().selectedId).toBe('new-addr-1');
    });
    // Modal 已关，仍留在 checkout（地址卡还在）
    expect(screen.queryByTestId('checkout-address-modal')).toBeNull();
    expect(screen.getByTestId('checkout-address')).toBeTruthy();
    useAddressSelectionStore.getState().clear();
  });

  it('表单校验：空提交不触发 mutate', () => {
    render(<CheckoutPage />, { wrapper });
    fireEvent.press(screen.getByTestId('checkout-add-address-entry'));
    fireEvent.press(screen.getByTestId('checkout-address-save'));
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it('取消分支：关闭 Modal 不触发 mutate', () => {
    render(<CheckoutPage />, { wrapper });
    fireEvent.press(screen.getByTestId('checkout-add-address-entry'));
    // Modal 组件 header close 按钮（common.close a11y label）
    const closeBtn = screen.root
      .findAll((n) => n.props.accessibilityRole === 'button')
      .find((n) => n.props.accessibilityLabel === 'common.close');
    expect(closeBtn).toBeTruthy();
    fireEvent.press(closeBtn!);
    expect(mockCreateMutate).not.toHaveBeenCalled();
    expect(screen.queryByTestId('checkout-address-modal')).toBeNull();
  });
});
