/**
 * 设置页通知偏好三开关测试（P17-B1，规则 8 + E12 payload 断言）
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

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

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
  mockPrefs = { orderUpdates: true, promotions: true, system: false };
  mockIsAuthenticated = true;
});

describe('SettingsPage 通知偏好（P17-B1）', () => {
  it('已登录渲染三行开关，初始值来自 GET', () => {
    const { getByTestId } = render(<SettingsPage />, { wrapper });
    expect(getByTestId('settings-notifications')).toBeTruthy();
    expect(getByTestId('settings-notifications-promo')).toBeTruthy();
    expect(getByTestId('settings-notifications-system')).toBeTruthy();
  });

  it('拨动促销开关 → mutate 入参 {promotions: false}（E12 payload 断言）', () => {
    const { getByTestId } = render(<SettingsPage />, { wrapper });
    fireEvent(getByTestId('settings-notifications-promo-switch'), 'onValueChange', false);
    expect(mockMutate).toHaveBeenCalledWith({ promotions: false });
  });

  it('未登录不渲染三行（决策 1：偏好是登录态能力）', () => {
    mockIsAuthenticated = false;
    const { queryByTestId } = render(<SettingsPage />, { wrapper });
    expect(queryByTestId('settings-notifications')).toBeNull();
    expect(queryByTestId('settings-notifications-promo')).toBeNull();
  });
});
