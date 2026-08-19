/**
 * P23 通知页测试：markAllRead 单请求 / 时间分组 / 富内容场景 / 分 tab 空态 / 未登录态 / CTA 直达
 *
 * mock 三 hook + authStore + router + i18n（t 返 key，count 插值拼尾）。
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { router } from 'expo-router';
import NotificationsPage, { dayGroupOf } from '../notifications';

let mockIsAuthenticated = true;
let mockNotifications: import('@/types').Notification[] = [];
const mockMarkRead = jest.fn();
const mockMarkAllMutate = jest.fn();

jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: { isAuthenticated: boolean }) => boolean) =>
    selector({ isAuthenticated: mockIsAuthenticated }),
}));

jest.mock('@/services/queries/useNotifications', () => ({
  useNotifications: () => ({
    data: mockNotifications,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useMarkNotificationRead: () => ({ mutate: mockMarkRead }),
  useMarkAllNotificationsRead: () => ({ mutate: mockMarkAllMutate }),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    // Why: count/time 插值均拼尾（eta 的 time 插值在组件里传 {time}）
    t: (key: string, opts?: { count?: number; time?: string }) => {
      if (opts?.count !== undefined) return `${key}:${opts.count}`;
      if (opts?.time !== undefined) return `${key}:${opts.time}`;
      return key;
    },
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

// 夹具：3 条今天（1 未读配送中）+ 1 条昨天 + 1 条更早（富内容秒杀）
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}
function seedNotifications() {
  mockNotifications = [
    {
      id: 'n001', title: '订单配送中', body: '骑手即将送达', type: 'order', read: false,
      createdAt: hoursAgo(2),
      data: { orderId: 'o1', progress: 2, riderName: '陈师傅', riderPhone: '+67077000001', eta: '18:30' },
    },
    {
      id: 'n002', title: '优惠券到账', body: '20 元券', type: 'promotion', read: true,
      createdAt: hoursAgo(30),
      data: { couponId: 'c1' },
    },
    {
      id: 'n003', title: '系统维护', body: '今晚维护', type: 'system', read: true,
      createdAt: hoursAgo(24 * 7),
    },
  ];
}

beforeEach(() => {
  mockMarkRead.mockReset();
  mockMarkAllMutate.mockReset();
  (router.push as jest.Mock).mockReset();
  mockIsAuthenticated = true;
  seedNotifications();
});

describe('NotificationsPage（P23：分组 + 富内容 + 空态 + 直达）', () => {
  it('时间分组：今天/昨天分组头渲染（含未读计数）；更早组经 dayGroupOf 边界单测覆盖', () => {
    const { getByText } = render(<NotificationsPage />, { wrapper });
    // Why: earlier 组（第 3 屏外）在 RNTL 无布局环境下不渲染（真机滚动可见），
    //      其归组正确性由下方 dayGroupOf 纯函数单测覆盖
    expect(getByText('service.notifications.timeToday')).toBeTruthy();
    expect(getByText('service.notifications.timeYesterday')).toBeTruthy();
    // 今天组 1 未读
    expect(getByText('service.notifications.unreadCount:1')).toBeTruthy();
  });

  it('dayGroupOf 分组边界：2h 前今天 / 30h 前昨天 / 7d 前更早', () => {
    expect(dayGroupOf(hoursAgo(2))).toBe('today');
    expect(dayGroupOf(hoursAgo(30))).toBe('yesterday');
    expect(dayGroupOf(hoursAgo(24 * 7))).toBe('earlier');
    expect(dayGroupOf('not-a-date')).toBe('earlier');
  });

  it('D3 回归：全部已读按钮走 markAll 单次 mutate（非逐条循环）', () => {
    const { getByTestId } = render(<NotificationsPage />, { wrapper });
    fireEvent.press(getByTestId('notif-read-all'));
    expect(mockMarkAllMutate).toHaveBeenCalledTimes(1);
    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  it('D4 富内容：配送中通知渲染骑手行（riderName + eta）', () => {
    const { getByText } = render(<NotificationsPage />, { wrapper });
    expect(getByText('service.notifications.rider 陈师傅')).toBeTruthy();
    expect(getByText('service.notifications.eta:18:30')).toBeTruthy();
  });

  it('D3 改动 3 回归：点订单通知（带 orderId）直达 /order/[id]，并标记已读', () => {
    const { getByTestId } = render(<NotificationsPage />, { wrapper });
    fireEvent.press(getByTestId('n001'));
    expect(router.push).toHaveBeenCalledWith('/order/o1');
    expect(mockMarkRead).toHaveBeenCalledWith('n001');
  });

  it('D7 分 tab 空态：订单 tab 空显示 emptyOrder（非通用 empty）', () => {
    mockNotifications = [];
    const { getByTestId, getByText } = render(<NotificationsPage />, { wrapper });
    expect(getByTestId('notif-empty-all')).toBeTruthy();
    fireEvent.press(getByTestId('notif-tab-order'));
    expect(getByText('service.notifications.emptyOrder')).toBeTruthy();
  });

  it('D7 未登录态：优先渲染登录引导（loginTitle + 按钮 replace 登录页）', () => {
    mockIsAuthenticated = false;
    // Why: 未登录时 useNotifications 不请求（enabled: isAuthenticated）→ data undefined → 空态分支
    mockNotifications = [];
    const { getByTestId, getByText } = render(<NotificationsPage />, { wrapper });
    expect(getByTestId('notif-empty-login')).toBeTruthy();
    const btn = getByText('service.notifications.loginBtn');
    expect(btn).toBeTruthy();
    fireEvent.press(btn);
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
  });
});
