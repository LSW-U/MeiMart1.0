/**
 * P17-B1 通知偏好 hook 测试：乐观三件套 + 偏好副作用联动 invalidate
 * 对齐 useNotifications.optimistic.test.tsx 模式（mock service + testHarness）
 */
import { act } from '@testing-library/react-native';
import { notificationsApi, type NotificationPreferences } from '@/services/notifications';
import {
  NOTIFICATION_PREFS_KEY,
  NOTIFICATIONS_QUERY_KEY,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '../useNotifications';
import { createTestQueryClient, renderHookWithClient } from './testHarness';

jest.mock('@/services/notifications');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/store/toastStore', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const initialPrefs: NotificationPreferences = {
  orderUpdates: true,
  promotions: true,
  system: true,
};

function setup() {
  (notificationsApi.getPreferences as jest.Mock).mockResolvedValue(initialPrefs);
  const qc = createTestQueryClient();
  qc.setQueryData(NOTIFICATION_PREFS_KEY, initialPrefs);
  // 列表 key 预置数据（断言 invalidate 联动用）
  qc.setQueryData([...NOTIFICATIONS_QUERY_KEY, 'all'], []);
  return qc;
}

describe('useNotificationPreferences / useUpdateNotificationPreferences', () => {
  beforeEach(() => jest.clearAllMocks());

  it('update onMutate 乐观 merge（关闭促销立即生效）', async () => {
    const qc = setup();
    (notificationsApi.updatePreferences as jest.Mock).mockResolvedValue({
      ...initialPrefs,
      promotions: false,
    });
    const { result } = renderHookWithClient(() => useUpdateNotificationPreferences(), qc);

    await act(async () => {
      result.current.mutate({ promotions: false });
    });

    expect(qc.getQueryData<NotificationPreferences>(NOTIFICATION_PREFS_KEY)).toMatchObject({
      promotions: false,
    });
  });

  it('失败回滚到 previous（开关弹回）', async () => {
    const qc = setup();
    (notificationsApi.updatePreferences as jest.Mock).mockRejectedValue(
      new Error('network down'),
    );
    const { result } = renderHookWithClient(() => useUpdateNotificationPreferences(), qc);

    await act(async () => {
      result.current.mutate({ promotions: false });
    });

    expect(qc.getQueryData<NotificationPreferences>(NOTIFICATION_PREFS_KEY)).toEqual(initialPrefs);
  });

  it('onSuccess 用后端全量对齐 + invalidate 通知列表前缀（偏好过滤副作用联动）', async () => {
    const qc = setup();
    const next = { ...initialPrefs, promotions: false, system: false };
    (notificationsApi.updatePreferences as jest.Mock).mockResolvedValue(next);
    const { result } = renderHookWithClient(() => useUpdateNotificationPreferences(), qc);

    await act(async () => {
      result.current.mutate({ promotions: false });
    });

    // 全量对齐（不只 merge 的那一个 key）
    expect(qc.getQueryData<NotificationPreferences>(NOTIFICATION_PREFS_KEY)).toEqual(next);
    // 列表 key 被 invalidate（isInvalidated 标记）
    const listQuery = qc
      .getQueryCache()
      .find({ queryKey: [...NOTIFICATIONS_QUERY_KEY, 'all'] });
    expect(listQuery?.state.isInvalidated).toBe(true);
  });

  it('GET hook 初值来自 service', async () => {
    const qc = setup();
    const { result } = renderHookWithClient(() => useNotificationPreferences(), qc);
    await act(async () => undefined);
    expect(result.current.data).toEqual(initialPrefs);
  });
});
