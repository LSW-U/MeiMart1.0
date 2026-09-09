/**
 * 批B B3 未读角标真挂载测试：home 消息入口 + profile 通知入口
 *
 * 验证：
 *   - unreadCount > 0：badge-number 渲染 + accessibilityLabel 携带 count 插值
 *   - unreadCount = 0 / undefined（未登录 hook 不请求）→ Badge 返 null 不渲染
 *     （回归锚：home 原硬编码假角标「2」已删——未读 0 时不得再有角标）
 *   - profile-notifications 入口点击 → /service/notifications
 *
 * mock 全部数据 hooks（页面重，只验角标与导航，不验业务区）。
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { router } from 'expo-router';
import HomePage from '../(main)/home';
import ProfilePage from '../(main)/profile';

let mockUnreadCount: number | undefined = 0;
let mockIsAuthenticated = true;

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  // home 用到 Link/Stack？——只导出被引用的子集，缺了再补
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) =>
      opts?.count !== undefined ? `${key}:${opts.count}` : key,
  }),
}));

jest.mock('@/services/queries/useNotifications', () => ({
  useUnreadCount: () => ({ data: mockUnreadCount }),
}));

jest.mock('@/services/queries/useCatalog', () => ({
  useCategories: () => ({ data: [] }),
  useBanners: () => ({ data: [] }),
}));

jest.mock('@/services/queries/useProducts', () => ({
  useRecommendations: () => ({ data: [], isLoading: false, isError: false, refetch: jest.fn() }),
  useBuyAgain: () => ({ data: [] }),
}));

jest.mock('@/services/queries/usePromotions', () => ({
  usePromotions: () => ({ data: [] }),
}));

jest.mock('@/services/queries/useCart', () => ({
  useAddToCart: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/hooks/useWeakNetworkUI', () => ({
  useWeakNetworkUI: () => ({ shouldSkipNonEssential: false }),
}));

jest.mock('@/store/toastStore', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

// profile 页数据 hooks
jest.mock('@/services/queries/useUser', () => ({
  useProfile: () => ({ data: null, isLoading: false, isError: false }),
}));
jest.mock('@/services/queries/usePromotion', () => ({
  useCoupons: () => ({ data: [] }),
}));
jest.mock('@/services/queries/useFavorites', () => ({
  useFavorites: () => ({ data: [] }),
}));
jest.mock('@/services/queries/useOrders', () => ({
  useOrderCounts: () => ({ data: null }),
}));

jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: { isAuthenticated: boolean }) => boolean) =>
    selector({ isAuthenticated: mockIsAuthenticated }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('home 消息入口角标（B3：替换硬编码假角标 2）', () => {
  it('unreadCount=3 → badge-number 渲染，a11y label 带 count', () => {
    mockUnreadCount = 3;
    const { getByTestId, getByLabelText } = render(<HomePage />, { wrapper });
    expect(getByTestId('home-messages')).toBeTruthy();
    expect(getByTestId('badge-number')).toBeTruthy();
    // Badge accessibilityRole=image → RNTL 查 accessible 文本用 getByLabelText
    expect(getByLabelText('home.unreadBadge:3')).toBeTruthy();
  });

  it('P2-1：light 主题 badge 底为语义 error 红（非白底）→ on-primary 白字可读', () => {
    // 回归锚：原 color=ON_PRIMARY(#ffffff) 白底 + Badge label 恒 colors['on-primary']（light #ffffff）
    // → light 白底白字不可见。改传 colors.semantic.error（light #C62828 红底）后可读。
    mockUnreadCount = 2;
    const { getByTestId } = render(<HomePage />, { wrapper });
    const badge = getByTestId('badge-number');
    const flat = Array.isArray(badge.props.style) ? badge.props.style.flat() : [badge.props.style];
    const bgs = flat.filter((s) => s && 'backgroundColor' in s).map((s) => s.backgroundColor);
    // light 主题 semantic.error = #C62828（colors.ts:155）；禁止回退白底
    expect(bgs).toContain('#C62828');
    expect(bgs).not.toContain('#ffffff');
  });

  it('unreadCount=0 → 无角标（假角标回归锚：0 未读不显示）', () => {
    mockUnreadCount = 0;
    const { queryByTestId } = render(<HomePage />, { wrapper });
    expect(queryByTestId('badge-number')).toBeNull();
  });

  it('unreadCount=undefined（未登录不请求）→ 无角标不崩', () => {
    mockUnreadCount = undefined;
    const { queryByTestId, getByTestId } = render(<HomePage />, { wrapper });
    expect(queryByTestId('badge-number')).toBeNull();
    expect(getByTestId('home-messages')).toBeTruthy();
  });

  it('点击消息入口 → /service/notifications', () => {
    mockUnreadCount = 0;
    const { getByTestId } = render(<HomePage />, { wrapper });
    fireEvent.press(getByTestId('home-messages'));
    expect(router.push).toHaveBeenCalledWith('/service/notifications');
  });
});

describe('profile 通知入口角标（B3）', () => {
  it('unreadCount=5 → badge-number 渲染，a11y label 带 count', () => {
    mockUnreadCount = 5;
    const { getByTestId, getByLabelText } = render(<ProfilePage />, { wrapper });
    expect(getByTestId('profile-notifications')).toBeTruthy();
    expect(getByTestId('badge-number')).toBeTruthy();
    expect(getByLabelText('profile.unreadBadge:5')).toBeTruthy();
  });

  it('P2-1：light 主题 badge 底为语义 error 红（非白底）→ on-primary 白字可读', () => {
    mockUnreadCount = 1;
    const { getByTestId } = render(<ProfilePage />, { wrapper });
    const badge = getByTestId('badge-number');
    const flat = Array.isArray(badge.props.style) ? badge.props.style.flat() : [badge.props.style];
    const bgs = flat.filter((s) => s && 'backgroundColor' in s).map((s) => s.backgroundColor);
    expect(bgs).toContain('#C62828');
    expect(bgs).not.toContain('#ffffff');
  });

  it('unreadCount=0 → 无角标', () => {
    mockUnreadCount = 0;
    const { queryByTestId } = render(<ProfilePage />, { wrapper });
    expect(queryByTestId('badge-number')).toBeNull();
  });

  it('点击通知入口 → /service/notifications', () => {
    mockUnreadCount = 0;
    const { getByTestId } = render(<ProfilePage />, { wrapper });
    fireEvent.press(getByTestId('profile-notifications'));
    expect(router.push).toHaveBeenCalledWith('/service/notifications');
  });
});
