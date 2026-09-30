/**
 * C-P2-19: coupons 页三 query 按 tab 懒加载——
 * 挂载（available tab）仅 available 发请求；used/expired enabled=false 不请求；
 * 切 tab 后对应 query 才启用。hook 层 useCoupons opts.enabled 可选覆盖语义验证。
 */
import { act, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, renderHookWithClient } from './testHarness';
import { useCoupons } from '../usePromotion';

const mockListCoupons = jest.fn();
jest.mock('@/services/promotion', () => ({
  promotionApi: {
    listCoupons: (...args: unknown[]) => mockListCoupons(...args),
    validate: jest.fn(),
    listAvailableCoupons: jest.fn().mockResolvedValue([]),
    claimCoupon: jest.fn(),
  },
}));

jest.mock('@/store/authStore', () => ({
  useAuthStore: (sel: (s: { isAuthenticated: boolean }) => boolean) =>
    sel({ isAuthenticated: true }),
}));

const coupon = {
  id: 'c1',
  name: 'Coupon',
  code: 'X1',
  type: 'AMOUNT' as const,
  value: 5,
  minOrderAmount: 0,
  startAt: '2026-09-01T00:00:00Z',
  endAt: '2026-10-30T00:00:00Z',
};

describe('C-P2-19 useCoupons 按 tab 懒加载', () => {
  beforeEach(() => {
    mockListCoupons.mockReset().mockResolvedValue([coupon]);
  });

  it('挂载仅 available：used/expired enabled=false 不发请求（coupons 页初始态）', async () => {
    const qc = createTestQueryClient();
    const render1 = renderHookWithClient(() => useCoupons('available'), qc);
    const used = renderHookWithClient(
      () => useCoupons('used', { enabled: true && false }), // 模拟 tab !== 'used'
      qc,
    );
    const expired = renderHookWithClient(() => useCoupons('expired', { enabled: false }), qc);
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockListCoupons).toHaveBeenCalledTimes(1);
    expect(mockListCoupons).toHaveBeenCalledWith('available');
    expect(used.result.current.fetchStatus).toBe('idle');
    expect(expired.result.current.fetchStatus).toBe('idle');
    render1.unmount();
    used.unmount();
    expired.unmount();
  });

  it('enabled: true 显式覆盖默认登录态（tab 切到 used 后启用）', async () => {
    const qc = createTestQueryClient();
    const used = renderHookWithClient(() => useCoupons('used', { enabled: true }), qc);
    // Why: queryFn 的 promise 链经 RQ 内部多次 microtask 落 state，固定两拍 Promise.resolve
    //   会漏拍（调度器 timing 敏感）——用 waitFor 等待数据落定，同时消灭 act() 告警
    await waitFor(() => expect(used.result.current.data).toHaveLength(1));
    expect(mockListCoupons).toHaveBeenCalledWith('used');
    used.unmount();
  });

  it('enabled: false 显式压过登录态（未切到该 tab 即使已登录也不请求）', async () => {
    const qc = createTestQueryClient();
    const expired = renderHookWithClient(() => useCoupons('expired', { enabled: false }), qc);
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockListCoupons).not.toHaveBeenCalled();
    expect(expired.result.current.fetchStatus).toBe('idle');
    expired.unmount();
  });
});
