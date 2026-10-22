/**
 * 默认支付方式独立选择页测试（方案B 2026-10-22，app/settings/default-payment.tsx）
 *
 * 覆盖：渲染 auto+全量渠道（解 slice(0,2)）/ 点选写偏好（乐观 state + 共享
 * changeDefaultPayment → PATCH profile + AsyncStorage 副本 + toast）/ 同项静默返回。
 * mock 面同 settings-notif-prefs（authStore + queries + router + i18n 返 key）。
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import DefaultPaymentPage from '../settings/default-payment';

let mockIsAuthenticated = true;
let mockProfileData: { defaultPaymentMethod: string | null } | undefined = undefined;
const mockProfileMutate = jest.fn();

jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: { isAuthenticated: boolean }) => boolean) =>
    selector({ isAuthenticated: mockIsAuthenticated }),
}));

jest.mock('@/services/queries/useUser', () => ({
  useProfile: () => ({ data: mockProfileData }),
  useUpdateProfile: () => ({ mutate: mockProfileMutate, isPending: false, variables: undefined }),
}));

const mockPayMethods = [
  { id: 'pm-1', code: 'COD', name: 'COD', subtitle: 'Cash on delivery', available: true },
  { id: 'pm-2', code: 'LAISPAY', name: 'LaisPay', available: true },
];
jest.mock('@/services/queries/usePayment', () => ({
  usePaymentMethods: () => ({ data: mockPayMethods }),
}));

// changeDefaultPayment 走 requireActual 真实现；其内部 setDefaultPaymentMethod 落
// AsyncStorage —— mock AsyncStorage 断言本地副本写入（真模块的 catch 吞错会掩盖断言）。
// 基于jest.setup 的官方 mock 包装，spying setItem/removeItem/getItem
jest.mock('@react-native-async-storage/async-storage', () => {
  const actual = jest.requireActual(
    '@react-native-async-storage/async-storage/jest/async-storage-mock',
  );
  return {
    __esModule: true,
    default: {
      ...actual,
      setItem: jest.fn().mockResolvedValue(null),
      removeItem: jest.fn().mockResolvedValue(undefined),
      getItem: jest.fn().mockResolvedValue(null),
    },
  };
});

jest.mock('@/services/paymentPreference', () => ({
  ...jest.requireActual('@/services/paymentPreference'),
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

// mock 的 AsyncStorage spies（beforeEach/断言共用；default 形态导出）
const mockAS = jest.requireMock('@react-native-async-storage/async-storage').default as {
  setItem: jest.Mock;
  removeItem: jest.Mock;
};

beforeEach(() => {
  mockProfileMutate.mockReset();
  mockAS.setItem.mockReset();
  mockAS.removeItem.mockReset();
  mockIsAuthenticated = true;
  mockProfileData = undefined;
});

describe('DefaultPaymentPage（方案B 独立选择页）', () => {
  it('渲染 auto 首项 + 全量可用渠道（含 subtitle 副标题）', () => {
    const { getByTestId, getByText } = render(<DefaultPaymentPage />, { wrapper });
    expect(getByTestId('default-payment-option-auto')).toBeTruthy();
    expect(getByTestId('default-payment-option-COD')).toBeTruthy();
    expect(getByTestId('default-payment-option-LAISPAY')).toBeTruthy();
    expect(getByText('settings.defaultPayAuto')).toBeTruthy();
    expect(getByText('COD')).toBeTruthy();
  });

  it('点选新渠道 → 乐观写 AsyncStorage 副本 + PATCH profile（带 onError）', async () => {
    const { getByTestId } = render(<DefaultPaymentPage />, { wrapper });
    fireEvent.press(getByTestId('default-payment-option-LAISPAY'));
    await waitFor(() => {
      expect(mockProfileMutate).toHaveBeenCalledWith(
        { defaultPaymentMethod: 'LAISPAY' },
        expect.objectContaining({ onError: expect.any(Function) }),
      );
    });
    expect(mockAS.setItem).toHaveBeenCalledWith('settings.defaultPaymentMethod', 'LAISPAY');
    // 成功 toast（toastStore 全局 zustand，ToastContainer 在页面树外 → 断言 store 队列）
    await waitFor(() => {
      const { useToastStore } = jest.requireActual('@/store/toastStore');
      const msgs = useToastStore.getState().toasts.map((t: { message: string }) => t.message);
      expect(msgs).toContain('settings.defaultPaySaved');
    });
  });

  it('点选 auto → code null 走同一写路径（清偏好语义）', async () => {
    mockProfileData = { defaultPaymentMethod: 'COD' };
    const { getByTestId } = render(<DefaultPaymentPage />, { wrapper });
    await waitFor(() => {
      expect(getByTestId('default-payment-option-COD').props.accessibilityState.selected).toBe(
        true,
      );
    });
    fireEvent.press(getByTestId('default-payment-option-auto'));
    await waitFor(() => {
      expect(mockProfileMutate).toHaveBeenCalledWith(
        { defaultPaymentMethod: null },
        expect.objectContaining({ onError: expect.any(Function) }),
      );
    });
    expect(mockAS.removeItem).toHaveBeenCalledWith('settings.defaultPaymentMethod');
  });

  it('点当前已选项 → 静默返回不写偏好（审查 F4 同款语义）', () => {
    mockProfileData = { defaultPaymentMethod: 'COD' };
    const { getByTestId } = render(<DefaultPaymentPage />, { wrapper });
    fireEvent.press(getByTestId('default-payment-option-COD'));
    expect(mockProfileMutate).not.toHaveBeenCalled();
    expect(mockAS.setItem).not.toHaveBeenCalled();
  });

  it('未登录只渲染 header 兜底（列表不渲染）', () => {
    mockIsAuthenticated = false;
    const { queryByTestId } = render(<DefaultPaymentPage />, { wrapper });
    expect(queryByTestId('default-payment-option-auto')).toBeNull();
  });
});
