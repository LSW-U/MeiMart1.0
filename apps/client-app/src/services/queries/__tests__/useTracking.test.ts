/**
 * C-P2-14: useOrderTracking cancelled 闭包守卫——
 * unmount/依赖变化后，getTracking().then 与 30s 轮询回调不再 setState（防泄漏告警/脏状态）。
 */
import { renderHook, act } from '@testing-library/react-native';
import { useOrderTracking } from '@/services/queries/useTracking';

jest.mock('@/services/tracking', () => ({
  // 批3 P2-1：工厂返回 { socket, destroy }（destroy = 断连 + NetInfo 退订）
  connectOrderTracking: () => ({
    socket: { on: jest.fn(), off: jest.fn(), emit: jest.fn(), disconnect: jest.fn() },
    destroy: jest.fn(),
  }),
}));

const mockGetTracking = jest.fn();
jest.mock('@/services/orders', () => ({
  orderApi: { getTracking: (...args: unknown[]) => mockGetTracking(...args) },
}));

jest.mock('@/store/authStore', () => ({
  useAuthStore: (sel: (s: { accessToken: string }) => string) => sel({ accessToken: 'tok' }),
}));

const deferred = () => {
  let resolve!: (v: unknown) => void;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};

describe('C-P2-14 useOrderTracking cancelled 守卫', () => {
  beforeEach(() => {
    mockGetTracking.mockReset();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('unmount 后 getTracking 响应迟到 → 不 setState（不崩不脏写）', async () => {
    const d = deferred();
    mockGetTracking.mockReturnValueOnce(d.promise);
    const { result, unmount } = renderHook(() => useOrderTracking('o1'));
    unmount();
    await act(async () => {
      d.resolve({ orderStatus: 'DELIVERING', task: { estimatedArrival: '2026-09-30T13:00:00Z' } });
      await Promise.resolve();
    });
    // 关键断言：无异常抛出，state 保持初始值（estimatedArrival 未被迟到响应写入）
    expect(result.current.estimatedArrival).toBeNull();
    expect(mockGetTracking).toHaveBeenCalledWith('o1');
  });

  it('30s 轮询 in-flight 时 unmount → 轮询回调不 setState', async () => {
    // 初始 getTracking 立即完成（无 eta 字段走 task?. ?? null）
    mockGetTracking.mockResolvedValueOnce({ orderStatus: 'PREPARING', task: null });
    const { result, unmount } = renderHook(() => useOrderTracking('o1'));
    // 推进 5s 触发 checkTimer 启动轮询，再推 30s 触发一次轮询请求
    await act(async () => {
      jest.advanceTimersByTime(5_000);
      await Promise.resolve();
    });
    // 轮询请求挂起（不 resolve）
    const pending = deferred();
    mockGetTracking.mockReturnValueOnce(pending.promise);
    await act(async () => {
      jest.advanceTimersByTime(30_000);
      await Promise.resolve();
    });
    unmount();
    await act(async () => {
      pending.resolve({ orderStatus: 'DELIVERED', task: { estimatedArrival: 'x' } });
      await Promise.resolve();
    });
    expect(result.current.lastOrderStatus).toBeNull();
    expect(result.current.estimatedArrival).toBeNull();
  });

  it('在线正常路径：初始 getTracking 写入 estimatedArrival', async () => {
    mockGetTracking.mockResolvedValueOnce({
      orderStatus: 'DELIVERING',
      task: { estimatedArrival: '2026-09-30T13:30:00Z' },
    });
    const { result } = renderHook(() => useOrderTracking('o1'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.estimatedArrival).toBe('2026-09-30T13:30:00Z');
  });
});
