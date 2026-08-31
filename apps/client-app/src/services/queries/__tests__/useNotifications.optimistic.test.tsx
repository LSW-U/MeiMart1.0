import { act } from '@testing-library/react-native';
import type { Notification } from '@/types';
import { notificationsApi } from '@/services/notifications';
import {
  UNREAD_COUNT_QUERY_KEY,
  notificationsListKey,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../useNotifications';
import { createTestQueryClient, renderHookWithClient } from './testHarness';

jest.mock('@/services/notifications');

// Why: 列表 key 含 locale 维度（i18n 缓存修复），测试环境 i18n 默认 en
const ALL_KEY = notificationsListKey('en', false);
const UNREAD_KEY = notificationsListKey('en', true);

const baseNotifications: Notification[] = [
  {
    id: 'n1',
    title: '订单已发货',
    body: '您的订单已发出',
    type: 'order',
    read: false,
    createdAt: '2026-06-01',
  },
  {
    id: 'n2',
    title: '促销活动',
    body: '618 大促开始啦',
    type: 'promotion',
    read: false,
    createdAt: '2026-06-02',
  },
];

function setup() {
  (notificationsApi.list as jest.Mock).mockResolvedValue(baseNotifications);
  (notificationsApi.getUnreadCount as jest.Mock).mockResolvedValue(2);
  const qc = createTestQueryClient();
  // Why: useNotifications 用 [...NOTIFICATIONS_QUERY_KEY, 'all' | 'unread'] 作为 queryKey
  qc.setQueryData(ALL_KEY, baseNotifications);
  qc.setQueryData(UNREAD_KEY, baseNotifications); // 初始两条都未读
  qc.setQueryData(UNREAD_COUNT_QUERY_KEY, 2);
  return qc;
}

describe('useNotifications 乐观更新', () => {
  beforeEach(() => jest.clearAllMocks());

  it('useMarkNotificationRead 立即标记 read=true、从未读列表移除、未读数 -1', async () => {
    (notificationsApi.markRead as jest.Mock).mockResolvedValue({ success: true });
    const qc = setup();

    const { result } = renderHookWithClient(() => useMarkNotificationRead(), qc);
    await act(async () => {
      await result.current.mutateAsync('n1');
    });

    // all 列表：n1 已读，n2 仍未读
    const all = qc.getQueryData<Notification[]>(ALL_KEY)!;
    expect(all.find((n) => n.id === 'n1')?.read).toBe(true);
    expect(all.find((n) => n.id === 'n2')?.read).toBe(false);
    // unread 列表契约（仅未读）：n1 被移除，n2 保留
    const unread = qc.getQueryData<Notification[]>(UNREAD_KEY)!;
    expect(unread.find((n) => n.id === 'n1')).toBeUndefined();
    expect(unread.find((n) => n.id === 'n2')).toBeTruthy();
    // 未读数 -1
    expect(qc.getQueryData<number>(UNREAD_COUNT_QUERY_KEY)).toBe(1);
  });

  it('useMarkNotificationRead 服务端失败时 rollback（all/unread/count 全还原）', async () => {
    (notificationsApi.markRead as jest.Mock).mockRejectedValue(new Error('network'));
    const qc = setup();

    const { result } = renderHookWithClient(() => useMarkNotificationRead(), qc);
    await act(async () => {
      try {
        await result.current.mutateAsync('n1');
      } catch {
        // expected
      }
    });

    const all = qc.getQueryData<Notification[]>(ALL_KEY)!;
    expect(all.find((n) => n.id === 'n1')?.read).toBe(false);
    // unread 列表 n1 回来（rollback 后重新包含）
    const unread = qc.getQueryData<Notification[]>(UNREAD_KEY)!;
    expect(unread.find((n) => n.id === 'n1')).toBeTruthy();
    expect(qc.getQueryData<number>(UNREAD_COUNT_QUERY_KEY)).toBe(2);
  });

  it('useMarkAllNotificationsRead 全部标记已读、清空未读列表、未读数归零', async () => {
    (notificationsApi.markAllRead as jest.Mock).mockResolvedValue({ success: true });
    const qc = setup();

    const { result } = renderHookWithClient(() => useMarkAllNotificationsRead(), qc);
    await act(async () => {
      await result.current.mutateAsync();
    });

    const all = qc.getQueryData<Notification[]>(ALL_KEY)!;
    expect(all.every((n) => n.read)).toBe(true);
    expect(qc.getQueryData<Notification[]>(UNREAD_KEY)).toEqual([]);
    expect(qc.getQueryData<number>(UNREAD_COUNT_QUERY_KEY)).toBe(0);
  });
});
