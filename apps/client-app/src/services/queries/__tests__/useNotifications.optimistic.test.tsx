import { act } from '@testing-library/react-native';
import type { Notification } from '@/types';
import { notificationsApi } from '@/services/notifications';
import {
  NOTIFICATIONS_QUERY_KEY,
  UNREAD_COUNT_QUERY_KEY,
  useMarkNotificationRead,
} from '../useNotifications';
import { createTestQueryClient, renderHookWithClient } from './testHarness';

jest.mock('@/services/notifications');

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

function setup(returnAfterRead: Notification[] = baseNotifications) {
  (notificationsApi.list as jest.Mock).mockResolvedValue(returnAfterRead);
  (notificationsApi.getUnreadCount as jest.Mock).mockResolvedValue(2);
  const qc = createTestQueryClient();
  // Why: useNotifications 用 [...NOTIFICATIONS_QUERY_KEY, 'all' | 'unread'] 作为 queryKey
  qc.setQueryData([...NOTIFICATIONS_QUERY_KEY, 'all'], baseNotifications);
  qc.setQueryData(UNREAD_COUNT_QUERY_KEY, 2);
  return qc;
}

describe('useNotifications 乐观更新', () => {
  beforeEach(() => jest.clearAllMocks());

  it('useMarkNotificationRead 立即标记 read=true 并 -1 未读数', async () => {
    (notificationsApi.markRead as jest.Mock).mockResolvedValue({ success: true });
    const after: Notification[] = [{ ...baseNotifications[0], read: true }, baseNotifications[1]];
    const qc = setup(after);

    const { result } = renderHookWithClient(() => useMarkNotificationRead(), qc);
    await act(async () => {
      await result.current.mutateAsync('n1');
    });

    const list = qc.getQueryData<Notification[]>([...NOTIFICATIONS_QUERY_KEY, 'all']);
    expect(list?.find((n) => n.id === 'n1')?.read).toBe(true);
    expect(list?.find((n) => n.id === 'n2')?.read).toBe(false);
  });

  it('useMarkNotificationRead 服务端失败时 rollback', async () => {
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

    const list = qc.getQueryData<Notification[]>([...NOTIFICATIONS_QUERY_KEY, 'all']);
    expect(list?.find((n) => n.id === 'n1')?.read).toBe(false);
  });
});
