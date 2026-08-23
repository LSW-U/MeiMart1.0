/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';

import NotificationsPage from '../../../app/notifications';
import { showToast } from '../../../src/components/feedback/Toast';
import type { NotificationItem } from '../../../src/types/notification';

const showToastMock = showToast as jest.Mock;

/**
 * NotificationsPage 单测 —— P4：通知页 loading 误判空态 / markAsRead 阻塞跳转 / 空态无引导 / 时间无刷新。
 *
 * 覆盖 6 项拍板（均选 A）：
 *   P4-1  loading 三态——取 isLoading/isError/refetch，loading 期骨架卡不闪「暂无通知」，error 期重试
 *   P4-2  跳转解耦——跳转优先，markAsRead 失败 toast 不阻断跳转
 *   P4-3  空态增强——图标+标题+描述，分类空态文案区分
 *   P4-4  时间刷新——setInterval 60s tick（不直接测时序，断言 effect 已挂载即可）
 *   P4-5  全部已读——成功/失败 toast
 *
 * 桩法与 profile/edit.test.tsx 同源（web project + RN host 壳）：
 *   - useNotifications：mockQueryState 切 ok/loading/error（isLoading/isError/refetch）
 *   - useUnreadCount：固定 2（>0 渲染全部已读按钮）
 *   - useMarkAsRead/useMarkAllAsRead：mockMutateAsync 控成功/reject
 *   - useRiderSettings：language='zh' 走 zh 字典
 *   - expo-router：mockPush 断言跳转目标
 *   - showToast：mock 模块取 spy
 * mock 变量名前缀 mock*（jest factory 白名单要求）。
 */

const mockPush = jest.fn();
const mockMutateAsync = jest.fn();
const mockMarkAllMutateAsync = jest.fn();
const mockRefetch = jest.fn();

// 'ok' | 'loading' | 'error' —— 切 useNotifications 三态
let mockQueryState = 'ok';

// 默认 seed：1 条未读 task（带 link）+ 1 条已读 wallet
const mockItems: NotificationItem[] = [
  {
    id: 'n-task-1', category: 'task', titleKey: 'notification.template.newTask.title',
    messageKey: 'notification.template.newTask.message', vars: { orderId: 'JD-100' },
    createdAt: Date.now() - 5 * 60 * 1000, read: false, link: '/(main)/tasks',
  },
  {
    id: 'n-wallet-1', category: 'wallet', titleKey: 'notification.template.walletCredited.title',
    messageKey: 'notification.template.walletCredited.message', vars: { amount: '$24.50' },
    createdAt: Date.now() - 2 * 60 * 60 * 1000, read: true, link: '/(main)/earnings',
  },
];

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('../../../src/services/queries/useSettings', () => ({
  useRiderSettings: () => ({ data: { dutyStatus: 'onDuty', language: 'zh' } }),
}));

jest.mock('../../../src/services/queries/useNotifications', () => ({
  useNotifications: () => {
    if (mockQueryState === 'loading') return { data: undefined, isLoading: true, isError: false, refetch: mockRefetch };
    if (mockQueryState === 'error') return { data: undefined, isLoading: false, isError: true, refetch: mockRefetch };
    return { data: mockItems, isLoading: false, isError: false, refetch: mockRefetch };
  },
  useUnreadCount: () => ({ data: 2 }),
  useMarkAsRead: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useMarkAllAsRead: () => ({ mutateAsync: mockMarkAllMutateAsync, isPending: false }),
}));

jest.mock('../../../src/components/feedback/Toast', () => ({
  showToast: jest.fn(),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<NotificationsPage />, { wrapper });
}

/** 取通知卡（accessibilityLabel = 卡标题 i18n 文案）。 */
function getNotificationCard(container: HTMLElement, label: string): Element {
  const cards = container.querySelectorAll('[data-rn-host="Pressable"]');
  return Array.from(cards).find((el) => (el.getAttribute('data-prop-accessibilitylabel') ?? '') === label)!;
}

beforeEach(() => {
  showToastMock.mockClear();
  mockPush.mockClear();
  mockMutateAsync.mockReset();
  mockMarkAllMutateAsync.mockReset();
  mockRefetch.mockClear();
  mockQueryState = 'ok';
});

describe('P4-1 loading 三态分支', () => {
  it('loading 期显骨架卡（testID=notification-skeleton），不闪「暂无通知」', () => {
    mockQueryState = 'loading';
    const { container, queryByText } = renderPage();
    // 骨架卡渲染
    expect(container.querySelector('[data-testid="notification-skeleton"]')).not.toBeNull();
    // 不误判空态闪「暂无通知」
    expect(queryByText('暂无通知')).toBeNull();
    // 不渲染真实通知卡标题
    expect(queryByText('有新任务可接')).toBeNull();
  });

  it('error 期显重试按钮（onPress=refetch），不显空态', () => {
    mockQueryState = 'error';
    const { container, queryByText } = renderPage();
    expect(queryByText('暂无通知')).toBeNull();
    // ErrorState 渲染重试按钮
    const retryBtn = Array.from(container.querySelectorAll('[data-rn-host="Pressable"]'))
      .find((el) => (el.getAttribute('data-prop-accessibilitylabel') ?? '') === '重试');
    expect(retryBtn).toBeTruthy();
    act(() => fireEvent.click(retryBtn!));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('ok 态显真实通知列表（标题「有新任务可接」），无骨架无 error', () => {
    const { container, queryByText } = renderPage();
    expect(queryByText('有新任务可接')).toBeTruthy();
    expect(container.querySelector('[data-testid="notification-skeleton"]')).toBeNull();
    expect(container.querySelector('[data-testid="error-state"]')).toBeNull();
  });
});

describe('P4-2 跳转解耦 + 失败降级', () => {
  it('点未读通知：跳转立即发生（router.push），markAsRead 成功无 toast', async () => {
    const { container } = renderPage();
    mockMutateAsync.mockResolvedValueOnce({});
    const card = getNotificationCard(container, '有新任务可接');
    await act(async () => {
      fireEvent.click(card);
      await Promise.resolve();
    });
    // 跳转优先（不被 markAsRead await 阻塞）
    expect(mockPush).toHaveBeenCalledWith('/(main)/tasks');
    expect(mockMutateAsync).toHaveBeenCalledWith('n-task-1');
    // 成功无 toast
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it('markAsRead 失败：跳转仍发生 + error toast「标记已读失败…」（不阻断）', async () => {
    const { container } = renderPage();
    mockMutateAsync.mockRejectedValueOnce(new Error('boom'));
    const card = getNotificationCard(container, '有新任务可接');
    await act(async () => {
      fireEvent.click(card);
      await Promise.resolve();
    });
    // 跳转不被阻断
    expect(mockPush).toHaveBeenCalledWith('/(main)/tasks');
    // 失败 toast
    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('标记已读失败，请稍后重试', 'error');
    });
  });

  it('点已读通知：不调 markAsRead，仅跳转', async () => {
    const { container } = renderPage();
    const card = getNotificationCard(container, '钱包到账');
    await act(async () => {
      fireEvent.click(card);
      await Promise.resolve();
    });
    expect(mockPush).toHaveBeenCalledWith('/(main)/earnings');
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});

describe('P4-3 空态增强（全部/分类文案区分）', () => {
  // 复用 ok 态但 items 为空：动态改 mockItems
  it('全部空态：图标 notification + 标题「暂无通知」+ 描述 empty.hint', () => {
    const saved = mockItems.slice();
    mockItems.length = 0;
    const { container, getByText } = renderPage();
    expect(container.querySelector('[data-testid="notification-empty"]')).not.toBeNull();
    // 图标 AppIcon name="notification" → bell-outline
    expect(container.querySelector('[data-testid="icon-bell-outline"]')).not.toBeNull();
    expect(getByText('暂无通知')).toBeTruthy();
    expect(getByText('有新任务或到账时会在这里提醒你')).toBeTruthy();
    mockItems.push(...saved);
  });

  it('分类空态（filter=task 无数据）：描述用 empty.filtered「该分类暂无通知」', () => {
    // mockItems 只剩 wallet 一条 → 切 task 分类显分类空态
    const saved = mockItems.slice();
    mockItems.length = 0;
    mockItems.push({
      id: 'n-wallet-1', category: 'wallet', titleKey: 'notification.template.walletCredited.title',
      messageKey: 'notification.template.walletCredited.message', vars: { amount: '$24.50' },
      createdAt: Date.now() - 2 * 60 * 60 * 1000, read: true,
    });
    const { container, getByText } = renderPage();
    // 点「任务」过滤器
    const taskFilter = Array.from(container.querySelectorAll('[data-rn-host="Pressable"]'))
      .find((el) => (el.getAttribute('data-prop-accessibilitylabel') ?? '') === '任务')!;
    act(() => fireEvent.click(taskFilter));
    expect(getByText('该分类暂无通知')).toBeTruthy();
    expect(container.querySelector('[data-testid="notification-empty"]')).not.toBeNull();
    mockItems.length = 0;
    mockItems.push(...saved);
  });
});

describe('P4-5 全部已读反馈', () => {
  it('全部已读成功：success toast「已全部标记为已读」', async () => {
    const { container } = renderPage();
    mockMarkAllMutateAsync.mockResolvedValueOnce({});
    const markAllBtn = Array.from(container.querySelectorAll('[data-rn-host="Pressable"]'))
      .find((el) => (el.getAttribute('data-prop-accessibilitylabel') ?? '') === '全部已读')!;
    await act(async () => {
      fireEvent.click(markAllBtn);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('已全部标记为已读', 'success');
    });
  });

  it('全部已读失败：error toast「全部已读失败…」', async () => {
    const { container } = renderPage();
    mockMarkAllMutateAsync.mockRejectedValueOnce(new Error('boom'));
    const markAllBtn = Array.from(container.querySelectorAll('[data-rn-host="Pressable"]'))
      .find((el) => (el.getAttribute('data-prop-accessibilitylabel') ?? '') === '全部已读')!;
    await act(async () => {
      fireEvent.click(markAllBtn);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('全部已读失败，请稍后重试', 'error');
    });
  });
});

describe('相对时间渲染（P4-4 formatTime 基线）', () => {
  it('5 分钟前的通知显「{minutes} 分钟前」', () => {
    const { container } = renderPage();
    // mockItems[0] createdAt = now - 5min → 「5 分钟前」
    const texts = Array.from(container.querySelectorAll('[data-rn-host="Text"]'))
      .map((el) => el.textContent ?? '');
    expect(texts).toContain('5 分钟前');
  });
});
