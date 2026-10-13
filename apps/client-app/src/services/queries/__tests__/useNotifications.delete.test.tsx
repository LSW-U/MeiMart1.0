import { act, waitFor } from '@testing-library/react-native';
import type { Notification } from '@/types';
import { notificationsApi } from '@/services/notifications';
import {
  UNREAD_COUNT_QUERY_KEY,
  notificationsListKey,
  useDeleteNotifications,
} from '../useNotifications';
import { createTestQueryClient, renderHookWithClient } from './testHarness';

jest.mock('@/services/notifications');

// Why: 批1 queryKey 去 locale（透传后切语言不需换 key 重查）
const ALL_KEY = notificationsListKey(false);
const UNREAD_KEY = notificationsListKey(true);

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
  {
    id: 'n3',
    title: '系统通知',
    body: '系统维护',
    type: 'system',
    read: true,
    createdAt: '2026-06-03',
  },
];

function setup() {
  (notificationsApi.list as jest.Mock).mockResolvedValue(baseNotifications);
  (notificationsApi.getUnreadCount as jest.Mock).mockResolvedValue(2);
  const qc = createTestQueryClient();
  qc.setQueryData(ALL_KEY, baseNotifications);
  qc.setQueryData(
    UNREAD_KEY,
    baseNotifications.filter((n) => !n.read),
  );
  qc.setQueryData(UNREAD_COUNT_QUERY_KEY, 2);
  return qc;
}

describe('useDeleteNotifications 乐观删除（批2 B4）', () => {
  beforeEach(() => jest.clearAllMocks());

  it('乐观删除：all/unread 列表移除、未读数按删掉的未读条数递减', async () => {
    (notificationsApi.deleteNotifications as jest.Mock).mockResolvedValue({ success: true });
    const qc = setup();

    const { result } = renderHookWithClient(() => useDeleteNotifications(), qc);
    await act(async () => {
      await result.current.mutateAsync(['n1', 'n3']); // n1 未读 + n3 已读
    });

    await waitFor(() => {
      const all = qc.getQueryData<Notification[]>(ALL_KEY)!;
      expect(all.find((n) => n.id === 'n1')).toBeUndefined();
    });
    const all = qc.getQueryData<Notification[]>(ALL_KEY)!;
    expect(all.map((n) => n.id)).toEqual(['n2']);
    // unread 列表契约（仅未读）：n1 移除
    const unread = qc.getQueryData<Notification[]>(UNREAD_KEY)!;
    expect(unread.map((n) => n.id)).toEqual(['n2']);
    // 未读数只减删除项中的未读条数（2 - 1 = 1，n3 已读不动计数）
    expect(qc.getQueryData<number>(UNREAD_COUNT_QUERY_KEY)).toBe(1);
  });

  it('服务端失败时 rollback（snapshot 恢复 all/unread/count）', async () => {
    (notificationsApi.deleteNotifications as jest.Mock).mockRejectedValue(new Error('network'));
    const qc = setup();

    const { result } = renderHookWithClient(() => useDeleteNotifications(), qc);
    await act(async () => {
      try {
        await result.current.mutateAsync(['n1', 'n2']);
      } catch {
        // expected
      }
    });

    await waitFor(() => {
      const all = qc.getQueryData<Notification[]>(ALL_KEY)!;
      expect(all).toHaveLength(3);
    });
    const unread = qc.getQueryData<Notification[]>(UNREAD_KEY)!;
    expect(unread).toHaveLength(2);
    expect(qc.getQueryData<number>(UNREAD_COUNT_QUERY_KEY)).toBe(2);
  });

  it('onSettled invalidate 列表前缀校准服务端真值', async () => {
    (notificationsApi.deleteNotifications as jest.Mock).mockResolvedValue({ success: true });
    const qc = setup();
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');

    const { result } = renderHookWithClient(() => useDeleteNotifications(), qc);
    await act(async () => {
      await result.current.mutateAsync(['n1']);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['user', 'notifications'] });
    });
  });

  // 批2 审查 P2-2：unread 列表 key 从未加载（previous.unread === undefined）时——
  // onMutate 跳过该 key（restoreNotificationSnapshot 同样跳过 undefined 条目，
  // 不误清尚未加载的 query），invalidate 后走首拉；count 未加载时也不写。
  it('unread/count key 未预置时 onMutate 跳过、不误清缓存，invalidate 首拉路径', async () => {
    (notificationsApi.deleteNotifications as jest.Mock).mockResolvedValue({ success: true });
    const qc = createTestQueryClient();
    // 仅预置 all 列表；unread 与 unread-count 均未加载（undefined）
    qc.setQueryData(ALL_KEY, baseNotifications);
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');

    const { result } = renderHookWithClient(() => useDeleteNotifications(), qc);
    await act(async () => {
      await result.current.mutateAsync(['n1']);
    });

    await waitFor(() => {
      const all = qc.getQueryData<Notification[]>(ALL_KEY)!;
      expect(all.find((n) => n.id === 'n1')).toBeUndefined();
    });
    // undefined 的 key 保持「未加载」状态（没有误写入空数组/0）
    expect(qc.getQueryData(UNREAD_KEY)).toBeUndefined();
    expect(qc.getQueryData(UNREAD_COUNT_QUERY_KEY)).toBeUndefined();
    // 失败回滚同样不误清（skip undefined 的还原语义由 snapshot 基建保证）
    // invalidate 前缀命中 → unread/count 首拉
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['user', 'notifications'] });
  });
});
