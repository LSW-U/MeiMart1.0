/**
 * 优惠券列表页（app/coupons.tsx）P18 优化测试：
 * D2 tab 独立三态 / D3 近过期提醒 / D6 分 tab 空态（含未登录）
 *
 * mock promotion hooks + authStore + router + i18n 返 key（插值 count 追加）。
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import CouponsPage from '../coupons';

let mockIsAuthenticated = true;
const coupon = (id: string, endAt: string) => ({
  id,
  code: id.toUpperCase(),
  name: `Coupon ${id}`,
  description: null,
  type: 'FIXED_AMOUNT' as const,
  value: 5,
  minOrderAmount: 20,
  maxDiscountAmount: null,
  startAt: '2026-08-01T00:00:00Z',
  endAt,
  status: 'available' as const,
});

// 三个 status 的数据槽（切换测试场景）
let mockData: Record<'available' | 'used' | 'expired', ReturnType<typeof coupon>[]> = {
  available: [],
  used: [],
  expired: [],
};
let mockLoading: Record<'available' | 'used' | 'expired', boolean> = {
  available: false,
  used: false,
  expired: false,
};
let mockError: Record<'available' | 'used' | 'expired', boolean> = {
  available: false,
  used: false,
  expired: false,
};

jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: { isAuthenticated: boolean }) => boolean) =>
    selector({ isAuthenticated: mockIsAuthenticated }),
}));

jest.mock('@/services/queries/usePromotion', () => ({
  useCoupons: (status: 'available' | 'used' | 'expired') => ({
    data: mockData[status],
    isLoading: mockLoading[status],
    isError: mockError[status],
    refetch: jest.fn(),
  }),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) => (opts?.count !== undefined ? `${key}:${opts.count}` : key),
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

beforeEach(() => {
  mockIsAuthenticated = true;
  mockData = { available: [], used: [], expired: [] };
  mockLoading = { available: false, used: false, expired: false };
  mockError = { available: false, used: false, expired: false };
});

describe('CouponsPage P18 优化', () => {
  it('D6 未登录 → 登录空态（含去登录 action）', () => {
    mockIsAuthenticated = false;
    const { getByText } = render(<CouponsPage />, { wrapper });
    expect(getByText('coupons.loginTitle')).toBeTruthy();
    expect(getByText('profile.loginRegister')).toBeTruthy();
  });

  it('D6 已登录 available 空 → 去领券中心空态', () => {
    const { getByText } = render(<CouponsPage />, { wrapper });
    expect(getByText('coupons.emptyAvailableTitle')).toBeTruthy();
    expect(getByText('coupons.goClaim')).toBeTruthy();
  });

  it('D3 近过期券出现提醒条（3 天内，count 插值），远期券不出现', () => {
    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const far = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    mockData.available = [coupon('c1', soon), coupon('c2', far)];

    const { getByTestId, getByText } = render(<CouponsPage />, { wrapper });
    expect(getByTestId('coupon-expiring')).toBeTruthy();
    expect(getByText('coupons.expiringSoon:1')).toBeTruthy(); // 只有 c1 近过期
  });

  it('D2 error 态只看当前 tab：used tab 出错不影响切回 available', () => {
    mockError.used = true;
    mockData.available = [coupon('c1', new Date(Date.now() + 30 * 86400000).toISOString())];
    const { getByText, queryByText, getAllByText } = render(<CouponsPage />, { wrapper });

    // 初始 available：正常渲染券卡（used 的 error 不殃及）
    expect(queryByText('coupons.loadError')).toBeNull();
    expect(getAllByText(/Coupon c1/i).length).toBeGreaterThan(0);

    // 切到 used：显示 error
    fireEvent.press(getByText('coupons.tabUsed'));
    expect(getByText('coupons.loadError')).toBeTruthy();
  });
});
