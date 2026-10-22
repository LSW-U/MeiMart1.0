/**
 * 设置页通知偏好开关测试（P17-B1 + 2026-10-21 并入简化，规则 8 + E12 payload 断言）
 *
 * 2026-10-21 变更：三开关 → 两开关——系统公告并入订单通知（拨动同步写
 * orderUpdates + system 两字段），system 行 UI 移除（后端契约不动）。
 *
 * mock authStore 登录态 + preference hooks + router + i18n 返 key。
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import SettingsPage from '../settings';

let mockIsAuthenticated = true;
const mockMutate = jest.fn();
let mockPrefs: { orderUpdates: boolean; promotions: boolean; system: boolean } | undefined = {
  orderUpdates: true,
  promotions: true,
  system: false,
};

jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: { isAuthenticated: boolean }) => boolean) =>
    selector({ isAuthenticated: mockIsAuthenticated }),
}));

jest.mock('@/services/queries/useNotifications', () => ({
  useNotificationPreferences: () => ({ data: mockPrefs, isLoading: false }),
  useUpdateNotificationPreferences: () => ({
    mutate: mockMutate,
    isPending: false,
    variables: undefined,
  }),
}));

// V20：设置页地址行右值接 useAddresses（页面顶层 hook，测试补 mock）
jest.mock('@/services/queries/useAddress', () => ({
  useAddresses: () => ({ data: [] }),
}));

// 默认支付方式行（方案乙批2）：settings 页引入 useProfile/useUpdateProfile（读写切 profile），
// mock 掉避免真 query client 依赖；方案A 测试用 mockProfileData 驱动选中态
let mockProfileData: { defaultPaymentMethod: string | null } | undefined = undefined;
const mockProfileMutate = jest.fn();
jest.mock('@/services/queries/useUser', () => ({
  useProfile: () => ({ data: mockProfileData }),
  useUpdateProfile: () => ({ mutate: mockProfileMutate, isPending: false, variables: undefined }),
}));

// 默认支付方式行（方案甲）：mock 支付方式列表 + 本地偏好读写
const mockPayMethods = [
  { id: 'pm-1', code: 'COD', name: 'COD', available: true },
  { id: 'pm-2', code: 'LAISPAY', name: 'LaisPay', available: true },
];
jest.mock('@/services/queries/usePayment', () => ({
  usePaymentMethods: () => ({ data: mockPayMethods }),
}));
jest.mock('@/services/paymentPreference', () => ({
  getDefaultPaymentMethod: jest.fn().mockResolvedValue(null),
  setDefaultPaymentMethod: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

const { router: mockRouter } = jest.requireMock('expo-router') as {
  router: { push: ReturnType<typeof jest.fn> };
};
const routerPush = mockRouter.push;

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

beforeEach(() => {
  mockMutate.mockReset();
  mockProfileMutate.mockReset();
  routerPush.mockClear();
  mockPrefs = { orderUpdates: true, promotions: true, system: false };
  mockIsAuthenticated = true;
  mockProfileData = undefined;
});

describe('SettingsPage 通知偏好（P17-B1，两开关并入形态）', () => {
  it('已登录渲染两行开关，system 行不再渲染（并入订单通知）', () => {
    const { getByTestId, queryByTestId } = render(<SettingsPage />, { wrapper });
    expect(getByTestId('settings-notifications')).toBeTruthy();
    expect(getByTestId('settings-notifications-promo')).toBeTruthy();
    expect(queryByTestId('settings-notifications-system')).toBeNull();
  });

  it('拨动订单通知开关 → mutate 入参 {orderUpdates, system} 两字段联动（并入语义）', () => {
    const { getByTestId } = render(<SettingsPage />, { wrapper });
    fireEvent(getByTestId('settings-notifications-switch'), 'onValueChange', false);
    expect(mockMutate).toHaveBeenCalledWith({ orderUpdates: false, system: false });
    fireEvent(getByTestId('settings-notifications-switch'), 'onValueChange', true);
    expect(mockMutate).toHaveBeenCalledWith({ orderUpdates: true, system: true });
  });

  it('拨动促销开关 → mutate 入参 {promotions: false}（E12 payload 断言）', () => {
    const { getByTestId } = render(<SettingsPage />, { wrapper });
    fireEvent(getByTestId('settings-notifications-promo-switch'), 'onValueChange', false);
    expect(mockMutate).toHaveBeenCalledWith({ promotions: false });
  });

  it('未登录不渲染开关组（决策 1：偏好是登录态能力）', () => {
    mockIsAuthenticated = false;
    const { queryByTestId } = render(<SettingsPage />, { wrapper });
    expect(queryByTestId('settings-notifications')).toBeNull();
    expect(queryByTestId('settings-notifications-promo')).toBeNull();
  });
});

describe('SettingsPage 默认支付方式（方案B 独立页形态）', () => {
  it('行渲染当前值 + 点击跳转 /settings/default-payment', () => {
    mockProfileData = { defaultPaymentMethod: 'COD' };
    const { getByTestId, getByText } = render(<SettingsPage />, { wrapper });
    expect(getByTestId('settings-default-payment')).toBeTruthy();
    // 行右值显示当前渠道名（payValueLabel 读 payableMethods 找 code）
    expect(getByText('COD')).toBeTruthy();
    fireEvent.press(getByTestId('settings-default-payment'));
    expect(routerPush).toHaveBeenCalledWith('/settings/default-payment');
  });

  it('未登录不渲染默认支付方式行（偏好是登录态能力，与通知偏好同门控）', () => {
    mockIsAuthenticated = false;
    const { queryByTestId } = render(<SettingsPage />, { wrapper });
    expect(queryByTestId('settings-default-payment')).toBeNull();
  });
});
