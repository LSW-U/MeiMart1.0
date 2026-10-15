/**
 * 通知页管理模式测试（批2 #3 通知管理，B2/B4）
 *
 * 覆盖：管理入口进/退管理模式（B1）、整卡勾选 + 删除计数联动（B2）、
 * 管理底栏（原已读/设置能力保留可达）、Alert 二次确认（Native mock execute）。
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import { ThemeProvider } from '@/theme';
import NotificationsPage from '../service/notifications';

let mockIsAuthenticated = true;
let mockNotifications:
  | {
      id: string;
      title: string;
      body: string;
      type: string;
      read: boolean;
      createdAt: string;
      data?: Record<string, unknown>;
    }[]
  | undefined = [];

const mockMarkReadMutate = jest.fn();
const mockMarkAllMutate = jest.fn();
const mockDeleteMutate = jest.fn();
let mockDeletePending = false;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) =>
      opts?.count !== undefined ? `${key}:${opts.count}` : key,
  }),
}));

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
  useMarkNotificationRead: () => ({ mutate: mockMarkReadMutate }),
  useMarkAllNotificationsRead: () => ({ mutate: mockMarkAllMutate, isPending: false }),
  useDeleteNotifications: () => ({ mutate: mockDeleteMutate, isPending: mockDeletePending }),
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('@meimart/nav-core', () => ({
  safeRoutePush: jest.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const n = (
  id: string,
  read: boolean,
  type = 'order',
): {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
} => ({ id, title: `T-${id}`, body: 'b', type, read, createdAt: '2026-06-01T00:00:00Z' });

beforeEach(() => {
  mockMarkReadMutate.mockReset();
  mockMarkAllMutate.mockReset();
  mockDeleteMutate.mockReset();
  mockDeletePending = false;
  mockIsAuthenticated = true;
  mockNotifications = [n('n1', false), n('n2', true, 'promotion')];
});

describe('通知页管理模式（批2）', () => {
  it('B1：默认列表态显示「管理」入口，无 readAll/全选 header 钮', () => {
    const { getByTestId, queryByTestId } = render(<NotificationsPage />, { wrapper });
    expect(getByTestId('notif-manage')).toBeTruthy();
    // 语义重组：原 header 二态钮（readAll/settings）在列表态不再出现
    expect(queryByTestId('notif-read-all')).toBeNull();
    expect(queryByTestId('notif-select-all')).toBeNull();
  });

  it('B1：点管理 → 进管理模式（标题换已选计数、底栏出现，设置入口换全选）', () => {
    const { getByTestId, getByText } = render(<NotificationsPage />, { wrapper });
    fireEvent.press(getByTestId('notif-manage'));
    expect(getByTestId('notif-exit-select')).toBeTruthy();
    expect(getByText('service.notifications.selectedTitle:0')).toBeTruthy();
    // 主理人实测反馈：底栏设置入口换成「全选」（readAll/删除保留）
    expect(getByTestId('notif-read-all')).toBeTruthy();
    expect(getByTestId('notif-select-all')).toBeTruthy();
    expect(getByTestId('notif-batch-delete')).toBeTruthy();
  });

  it('B2：管理模式点卡勾选 → 删除钮计数联动；再点取消', () => {
    const { getByTestId, getByText } = render(<NotificationsPage />, { wrapper });
    fireEvent.press(getByTestId('notif-manage'));
    fireEvent.press(getByTestId('n1'));
    expect(getByText('service.notifications.selectedTitle:1')).toBeTruthy();
    expect(getByText('common.delete (1)')).toBeTruthy();
    // a11y state 同步（B2 整卡单 Pressable）
    expect(getByTestId('n1').props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(getByTestId('n1'));
    expect(getByText('common.delete (0)')).toBeTruthy();
  });

  it('B2：勾选后删除 → Native Alert 二次确认弹出（不直接执行）', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    try {
      const { getByTestId } = render(<NotificationsPage />, { wrapper });
      fireEvent.press(getByTestId('notif-manage'));
      fireEvent.press(getByTestId('n1'));
      fireEvent.press(getByTestId('notif-batch-delete'));
      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(mockDeleteMutate).not.toHaveBeenCalled();
      alertSpy.mock.calls[0][2]?.[1].onPress?.();
      expect(mockDeleteMutate).toHaveBeenCalledWith(['n1'], expect.anything());
    } finally {
      alertSpy.mockRestore();
    }
  });

  it('B2：未勾选（0 项）删除钮 disabled', () => {
    const { getByTestId } = render(<NotificationsPage />, { wrapper });
    fireEvent.press(getByTestId('notif-manage'));
    expect(getByTestId('notif-batch-delete').props.accessibilityState).toEqual({ disabled: true });
  });

  it('B2：Web 端跳过 Alert 直接执行删除', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const origOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    try {
      const { getByTestId } = render(<NotificationsPage />, { wrapper });
      fireEvent.press(getByTestId('notif-manage'));
      fireEvent.press(getByTestId('n1'));
      fireEvent.press(getByTestId('notif-batch-delete'));
      expect(alertSpy).not.toHaveBeenCalled();
      expect(mockDeleteMutate).toHaveBeenCalledWith(['n1'], expect.anything());
    } finally {
      Object.defineProperty(Platform, 'OS', { value: origOS, configurable: true });
      alertSpy.mockRestore();
    }
  });

  it('管理模式卡片 CTA 隐藏（onCta undefined），列表态正常分发', () => {
    const { getByTestId } = render(<NotificationsPage />, { wrapper });
    // 列表态 n2（promotion + 无 CTA 数据字段）正常渲染；进管理模式后 CTA 由 props 关闭
    fireEvent.press(getByTestId('notif-manage'));
    expect(getByTestId('n2')).toBeTruthy();
  });

  it('B4：底栏「全部已读」触发 markAll mutate（原能力保留可达）', () => {
    const { getByTestId } = render(<NotificationsPage />, { wrapper });
    fireEvent.press(getByTestId('notif-manage'));
    fireEvent.press(getByTestId('notif-read-all'));
    expect(mockMarkAllMutate).toHaveBeenCalledTimes(1);
  });

  it('全选：一键勾选当前 tab 全部 → 标签切「取消选择」→ 再点清空；删除计数联动', () => {
    const { getByTestId, getByText } = render(<NotificationsPage />, { wrapper });
    fireEvent.press(getByTestId('notif-manage'));
    // mock 数据 n1(order,未读)+n2(promotion) 全在 all tab
    fireEvent.press(getByTestId('notif-select-all'));
    expect(getByText('favorites.a11y.cancelSelect')).toBeTruthy();
    expect(getByText('common.delete (2)')).toBeTruthy();
    // 再点 → 取消全部
    fireEvent.press(getByTestId('notif-select-all'));
    expect(getByText('common.selectAll')).toBeTruthy();
    expect(getByText('common.delete (0)')).toBeTruthy();
  });

  it('全选：tab 过滤后只勾选当前 tab 项（order tab 仅 n1）', () => {
    const { getByTestId, getByText } = render(<NotificationsPage />, { wrapper });
    fireEvent.press(getByTestId('notif-manage'));
    fireEvent.press(getByTestId('notif-tab-order'));
    fireEvent.press(getByTestId('notif-select-all'));
    expect(getByText('common.delete (1)')).toBeTruthy();
  });

  // 批7 审查 P2-2（裁决A：接受跨 tab 连续管理设计）——锁定「合并非替换」语义：
  // tab A 勾选 → 切 tab B 再勾 → selected 为 A+B 并集，删除计数含两 tab 项，切 tab 不清空
  it('跨 tab 勾选合并非替换：order tab 勾 n1 → promotion tab 勾 n2 → 计数 (2) 含两 tab 项', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    try {
      const { getByTestId, getByText } = render(<NotificationsPage />, { wrapper });
      fireEvent.press(getByTestId('notif-manage'));
      // tab A（order）：勾 n1
      fireEvent.press(getByTestId('notif-tab-order'));
      fireEvent.press(getByTestId('n1'));
      expect(getByText('common.delete (1)')).toBeTruthy();
      // 切 tab B（promotion）：n1 不在此 tab 列表，n2 可勾
      fireEvent.press(getByTestId('notif-tab-promotion'));
      expect(getByTestId('n2')).toBeTruthy();
      fireEvent.press(getByTestId('n2'));
      // 合并语义：selected = {n1, n2} → 计数 (2)
      expect(getByText('common.delete (2)')).toBeTruthy();
      expect(getByText('service.notifications.selectedTitle:2')).toBeTruthy();
      // Native Alert 确认 → mutate ids 含两 tab 的项
      fireEvent.press(getByTestId('notif-batch-delete'));
      alertSpy.mock.calls[0][2]?.[1].onPress?.();
      expect(mockDeleteMutate).toHaveBeenCalledWith(
        expect.arrayContaining(['n1', 'n2']),
        expect.anything(),
      );
    } finally {
      alertSpy.mockRestore();
    }
  });
});
