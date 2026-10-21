/**
 * 默认支付方式偏好（方案乙批2，2026-10-22）— 读写切 profile + checkout 优先级链
 *
 * 覆盖任务书-批2 §5 三类断言：
 * 1. settings 保存 → profile PATCH 调用（含 defaultPaymentMethod 透传字段）
 *    + AsyncStorage 本地副本同步（D5：invalidate 由 useUpdateProfile onSettled 现成，本文件 mock 层断言 mutate 入参）
 * 2. checkout 优先级链三档：后端偏好 > 本地缓存 > 默认（列表 isDefault = COD）
 * 3. 停用渠道静默降级边界：后端偏好渠道 available=false → 不预选死渠道，回落 isDefault
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import SettingsPage from '../settings';
import CheckoutPage from '../order/checkout';
import { userApi } from '@/services/user';
import { setDefaultPaymentMethod } from '@/services/paymentPreference';

// ===== settings 侧 mocks =====

let mockIsAuthenticated = true;
let mockProfile: { defaultPaymentMethod: string | null } | undefined = undefined;
const mockUpdateProfileMutate = jest.fn();

jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: { isAuthenticated: boolean }) => boolean) =>
    selector({ isAuthenticated: mockIsAuthenticated }),
}));

jest.mock('@/services/queries/useUser', () => ({
  useProfile: () => ({ data: mockProfile }),
  useUpdateProfile: () => ({
    mutate: mockUpdateProfileMutate,
    isPending: false,
    variables: undefined,
  }),
}));

jest.mock('@/services/queries/useNotifications', () => ({
  useNotificationPreferences: () => ({ data: undefined, isLoading: false }),
  useUpdateNotificationPreferences: () => ({
    mutate: jest.fn(),
    isPending: false,
    variables: undefined,
  }),
}));

jest.mock('@/services/queries/useAddress', () => ({
  useAddresses: () => ({ data: [] }),
}));

// ===== checkout 侧 mocks =====

const mockUsePaymentMethods = jest.fn();

jest.mock('@/services/queries/usePayment', () => ({
  usePaymentMethods: (...args: unknown[]) => mockUsePaymentMethods(...args),
}));

jest.mock('@/services/paymentPreference', () => ({
  getDefaultPaymentMethod: jest.fn(),
  setDefaultPaymentMethod: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}) as Record<string, string>,
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  // Why: toApiErrorText 用「t(key) === key 判缺 key 回退」，恒等 t 会让 E-USER-010 误判缺失；
  // 改为词典式 t——已知 key 返回模拟文案，未知 key 恒等返回（其余测试断言 key 值不受影响）
  useTranslation: () => ({
    t: (key: string) =>
      key === 'errors.E-USER-010' ? 'Invalid or unavailable payment method' : key,
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
  localize: (text: unknown): string => {
    const record = text as { en?: string; zh?: string } | string;
    if (typeof record === 'string') return record;
    return record.en ?? record.zh ?? '';
  },
}));

jest.mock('@/hooks/useWeakNetworkUI', () => ({
  useWeakNetworkUI: () => ({ isOffline: false }),
}));

jest.mock('@/services/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  isMockMode: false,
}));

jest.mock('@/services/mockDb', () => ({
  mockDb: { payments: [], orders: [], user: {} },
  mockResponse: async (value: unknown) => value,
}));

jest.mock('@/services/queries/useCart', () => ({
  useCart: () => ({
    data: {
      items: [
        {
          id: 'ci1',
          selected: true,
          quantity: 1,
          product: { id: 'p001', price: 25.9, name: { en: 'Apple' }, image: '', category: '' },
        },
      ],
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useCheckoutPreview: () => ({ data: undefined }),
  useClearCart: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock('@/store/toastStore', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
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
  useCreateOrder: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useOrder: () => ({ data: undefined }),
  useCancelOrder: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/components/business/CouponPicker/CouponPicker', () => ({
  CouponPicker: () => null,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const COD = {
  id: 'COD',
  code: 'COD',
  name: { en: 'Cash on Delivery' },
  icon: 'payments',
  isDefault: true,
  available: true,
};
const WECHAT = {
  id: 'WECHAT',
  code: 'WECHAT',
  name: { en: 'WeChat Pay' },
  icon: 'wechat',
  isDefault: false,
  available: true,
};
const LOCAL_PSP = {
  id: 'LOCAL_PSP',
  code: 'LOCAL_PSP',
  name: { en: 'Local PSP' },
  icon: 'storefront',
  isDefault: false,
  available: false,
};

// settings 页 mock usePaymentMethods（settings/checkout 共用同一 mock fn）
beforeEach(() => {
  jest.clearAllMocks();
  mockIsAuthenticated = true;
  mockProfile = undefined;
  (setDefaultPaymentMethod as jest.Mock).mockResolvedValue(undefined);
  const { getDefaultPaymentMethod } = jest.requireMock('@/services/paymentPreference') as {
    getDefaultPaymentMethod: jest.Mock;
  };
  getDefaultPaymentMethod.mockResolvedValue(null);
});

describe('settings 默认支付方式（方案乙批2：读写切 profile）', () => {
  it('渲染 available 渠道选项，选中值来自 profile.defaultPaymentMethod', async () => {
    mockProfile = { defaultPaymentMethod: 'WECHAT' };
    mockUsePaymentMethods.mockReturnValue({ data: [COD, WECHAT] });
    render(<SettingsPage />, { wrapper });
    const row = await screen.findByTestId('settings-default-payment', {}, { timeout: 2000 });
    expect(row).toBeTruthy();
    // 选中态来自后端偏好（非本地缓存）
    const seg = screen.getByTestId('settings-default-payment-segment-WECHAT');
    expect(seg.props.accessibilityState.selected).toBe(true);
  });

  it('切换选项 → useUpdateProfile.mutate 透传 defaultPaymentMethod + 本地副本同步（D5）', async () => {
    mockProfile = { defaultPaymentMethod: null };
    mockUsePaymentMethods.mockReturnValue({ data: [COD, WECHAT] });
    render(<SettingsPage />, { wrapper });
    await screen.findByTestId('settings-default-payment', {}, { timeout: 2000 });

    fireEvent(screen.getByTestId('settings-default-payment-segment-WECHAT'), 'onChange', 'WECHAT');
    // PATCH 入参透传字段（userApi.updateProfile 白名单映射的调用面）；
    // 第二参 options.onError = P3-2 失败 toast（toApiErrorText → errors ns 四语文案）
    expect(mockUpdateProfileMutate).toHaveBeenCalledWith(
      { defaultPaymentMethod: 'WECHAT' },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
    // P3-2：onError 走 toApiErrorText → toast.error（失败不静默）
    const { onError } = mockUpdateProfileMutate.mock.calls[0][1] as {
      onError: (e: unknown) => void;
    };
    onError({ response: { data: { error: { code: 'E-USER-010' } } } });
    const { toast: toastMock } = jest.requireMock('@/store/toastStore') as {
      toast: { error: jest.Mock };
    };
    expect(toastMock.error).toHaveBeenCalledWith('Invalid or unavailable payment method');
    // 本地副本同步写入
    expect(setDefaultPaymentMethod).toHaveBeenCalledWith('WECHAT');
  });

  it('profile 无值（null=未设置）→ 回退 AsyncStorage 本地缓存（离线降级）', async () => {
    mockProfile = { defaultPaymentMethod: null };
    mockUsePaymentMethods.mockReturnValue({ data: [COD, WECHAT] });
    const { getDefaultPaymentMethod } = jest.requireMock('@/services/paymentPreference') as {
      getDefaultPaymentMethod: jest.Mock;
    };
    getDefaultPaymentMethod.mockResolvedValue('COD');
    render(<SettingsPage />, { wrapper });
    const seg = await screen.findByTestId(
      'settings-default-payment-segment-COD',
      {},
      { timeout: 2000 },
    );
    expect(seg.props.accessibilityState.selected).toBe(true);
  });

  it('未登录不渲染偏好行（登录态门控，与通知偏好同决策）', () => {
    mockIsAuthenticated = false;
    mockUsePaymentMethods.mockReturnValue({ data: [COD, WECHAT] });
    const { queryByTestId } = render(<SettingsPage />, { wrapper });
    expect(queryByTestId('settings-default-payment')).toBeNull();
  });
});

describe('checkout 优先级链（方案乙批2 v3 §2.3）', () => {
  it('第一档：后端偏好命中可用渠道 → 预选它（优先于本地缓存与 isDefault）', async () => {
    mockProfile = { defaultPaymentMethod: 'WECHAT' };
    mockUsePaymentMethods.mockReturnValue({ data: [COD, WECHAT] });
    render(<CheckoutPage />, { wrapper });
    const wechat = await screen.findByTestId('payment-WECHAT', {}, { timeout: 2000 });
    expect(wechat.props.accessibilityState.selected).toBe(true);
  });

  it('第二档：后端偏好未设置 → 本地缓存生效（命中可用渠道）', async () => {
    mockProfile = { defaultPaymentMethod: null };
    mockUsePaymentMethods.mockReturnValue({ data: [COD, WECHAT] });
    const { getDefaultPaymentMethod } = jest.requireMock('@/services/paymentPreference') as {
      getDefaultPaymentMethod: jest.Mock;
    };
    getDefaultPaymentMethod.mockResolvedValue('WECHAT');
    render(<CheckoutPage />, { wrapper });
    // 本地缓存是异步 promise 消费：卡渲染（COD 先选中）与偏好切换（WECHAT）是两次渲染，
    // findByTestId 在卡出现即返回，须 waitFor 等选中态切到 WECHAT
    await waitFor(
      () => {
        expect(screen.getByTestId('payment-WECHAT').props.accessibilityState.selected).toBe(true);
      },
      { timeout: 2000 },
    );
  });

  it('第三档：都无 → 列表 isDefault（COD）预选', async () => {
    mockProfile = { defaultPaymentMethod: null };
    mockUsePaymentMethods.mockReturnValue({ data: [COD, WECHAT] });
    const { getDefaultPaymentMethod } = jest.requireMock('@/services/paymentPreference') as {
      getDefaultPaymentMethod: jest.Mock;
    };
    getDefaultPaymentMethod.mockResolvedValue(null);
    render(<CheckoutPage />, { wrapper });
    const cod = await screen.findByTestId('payment-COD', {}, { timeout: 2000 });
    expect(cod.props.accessibilityState.selected).toBe(true);
  });

  it('停用渠道边界：后端偏好 LOCAL_PSP 已 available=false → 静默降级 isDefault（COD），不预选死渠道', async () => {
    mockProfile = { defaultPaymentMethod: 'LOCAL_PSP' };
    mockUsePaymentMethods.mockReturnValue({ data: [COD, WECHAT, LOCAL_PSP] });
    render(<CheckoutPage />, { wrapper });
    await screen.findByTestId('payment-COD', {}, { timeout: 2000 });
    expect(screen.getByTestId('payment-COD').props.accessibilityState.selected).toBe(true);
    // 停用渠道渲染在 coming-soon 区，role=button 且无 selected 态（不可作为支付方式选中）
    const psp = screen.getByTestId('payment-LOCAL_PSP');
    expect(psp.props.accessibilityRole).toBe('button');
    expect(psp.props.accessibilityState?.selected ?? false).toBe(false);
  });

  it('userApi.updateProfile 白名单透传：defaultPaymentMethod 进 PATCH body（null 也透传）', async () => {
    const patchMock = jest.fn().mockResolvedValue({
      data: { id: 'u1', name: 'n', phone: 'p', email: '', defaultPaymentMethod: null },
    });
    (jest.requireMock('@/services/api').api.patch as jest.Mock) = patchMock;
    await userApi.updateProfile({ defaultPaymentMethod: 'WECHAT' });
    expect(patchMock).toHaveBeenCalledWith(
      '/client/user/profile',
      expect.objectContaining({ defaultPaymentMethod: 'WECHAT' }),
    );
    // null = 清除，白名单分支不得用 truthy 判定吞掉
    await userApi.updateProfile({ defaultPaymentMethod: null });
    expect(patchMock).toHaveBeenLastCalledWith(
      '/client/user/profile',
      expect.objectContaining({ defaultPaymentMethod: null }),
    );
  });
});

// 防「导入未使用」漂移：waitFor 在等待断言中使用（保持显式依赖）
void waitFor;
