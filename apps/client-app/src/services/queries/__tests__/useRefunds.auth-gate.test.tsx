/**
 * C-P2-2: useRefunds / useRefundDetail 未登录不发请求（enabled: isAuthenticated && …）
 *
 * 参照 useNotifications.optimistic.test 先例（renderHookWithClient + authStore.setState）。
 */
import { waitFor } from '@testing-library/react-native';
import { refundApi } from '@/services/refunds';
import { useAuthStore } from '@/store/authStore';
import { REFUNDS_QUERY_KEY, refundDetailKey, useRefunds, useRefundDetail } from '../useRefunds';
import { createTestQueryClient, renderHookWithClient } from './testHarness';

jest.mock('@/services/refunds', () => ({
  ...jest.requireActual('@/services/refunds'),
  refundApi: {
    listUserRefunds: jest.fn(),
    getRefundDetail: jest.fn(),
  },
}));

describe('C-P2-2 退款 query 未登录不发请求', () => {
  it('useRefunds：未登录 enabled=false 不发请求；登录后 enabled=true 发起', async () => {
    const client = createTestQueryClient();
    useAuthStore.setState({ accessToken: null, refreshToken: null, isAuthenticated: false });
    const { result } = renderHookWithClient(() => useRefunds(), client);
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(refundApi.listUserRefunds).not.toHaveBeenCalled();

    // 登录 → enabled 翻 true → 自动拉取
    useAuthStore.setState({ accessToken: 't', refreshToken: 'r', isAuthenticated: true });
    await waitFor(() => expect(refundApi.listUserRefunds).toHaveBeenCalled());
  });

  it('useRefundDetail：未登录不发（即使 id 有值）；登录后才发', async () => {
    const client = createTestQueryClient();
    useAuthStore.setState({ accessToken: null, refreshToken: null, isAuthenticated: false });
    const { result } = renderHookWithClient(() => useRefundDetail('r1'), client);
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(refundApi.getRefundDetail).not.toHaveBeenCalled();

    useAuthStore.setState({ accessToken: 't', refreshToken: 'r', isAuthenticated: true });
    await waitFor(() => expect(refundApi.getRefundDetail).toHaveBeenCalledWith('r1'));
  });

  it('key 形态不变（REFUNDS_QUERY_KEY / refundDetailKey 父子关系，回归防串）', () => {
    expect(REFUNDS_QUERY_KEY).toEqual(['refunds']);
    expect(refundDetailKey('r1')).toEqual(['refunds', 'r1']);
  });
});
