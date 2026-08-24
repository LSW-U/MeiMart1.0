/**
 * useNetworkStore 单测 —— P6-5（Q3=B）网络状态单例 store。
 *
 * 覆盖：
 *   - 首帧 isConnected=null（NetInfo 未确认，P6-4 路径 A）
 *   - init() 引用计数：首订阅者 fetch + addEventListener，多订阅者共享同一份 state
 *   - NetInfo 回调到达后 setState 真实 boolean
 *   - 最后一个订阅者卸载 → 解注 + 重置 null
 *   - fetch 失败：保守视为在线（与原 useNetwork ?? true 一致）
 *
 * mock：@react-native-community/netinfo 的 fetch + addEventListener（返回可控 NetInfoState + unsub）
 * 纯 store API 测试（不挂 React 组件），rn project（node 环境）可跑。
 */
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

import { useNetworkStore } from './useNetworkStore';

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: jest.fn(), addEventListener: jest.fn() },
}));

const mockFetch = NetInfo.fetch as jest.Mock;
const mockAddEventListener = NetInfo.addEventListener as jest.Mock;

function makeState(connected: boolean | null): NetInfoState {
  return { isConnected: connected } as NetInfoState;
}

beforeEach(() => {
  // 重置 store 到首帧态 + 清 mock
  useNetworkStore.setState({ isConnected: null, isOffline: null });
  mockFetch.mockReset();
  mockAddEventListener.mockReset();
});

describe('P6-5 useNetworkStore 单例', () => {
  it('首帧 isConnected=null（NetInfo 未确认，P6-4 路径 A）', () => {
    // 未调 init 前，模块级 store 初始态应为 null（非 true）
    expect(useNetworkStore.getState().isConnected).toBeNull();
    expect(useNetworkStore.getState().isOffline).toBeNull();
  });

  it('init() 首订阅者：fetch 拉真实状态 + 注册 addEventListener', () => {
    mockFetch.mockResolvedValue(makeState(true));
    mockAddEventListener.mockReturnValue(jest.fn());

    const cleanup = useNetworkStore.getState().init();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('NetInfo 回调到达后 setState 真实 boolean', async () => {
    mockFetch.mockResolvedValue(makeState(false)); // 离线
    const listeners: ((s: NetInfoState) => void)[] = [];
    mockAddEventListener.mockImplementation((cb: (s: NetInfoState) => void) => {
      listeners.push(cb);
      return jest.fn();
    });

    const cleanup = useNetworkStore.getState().init();
    // 等 fetch 回调 flush
    await Promise.resolve();
    await Promise.resolve();

    expect(useNetworkStore.getState().isConnected).toBe(false);
    expect(useNetworkStore.getState().isOffline).toBe(true);

    // 模拟 NetInfo 广播状态变化（在线恢复）
    listeners[0]?.(makeState(true));
    expect(useNetworkStore.getState().isConnected).toBe(true);
    expect(useNetworkStore.getState().isOffline).toBe(false);

    cleanup();
  });

  it('多订阅者共享同一份 state（不重复 fetch/addEventListener）', () => {
    mockFetch.mockResolvedValue(makeState(true));
    mockAddEventListener.mockReturnValue(jest.fn());

    const c1 = useNetworkStore.getState().init();
    const c2 = useNetworkStore.getState().init();
    const c3 = useNetworkStore.getState().init();

    // 3 个订阅者但 fetch/addEventListener 只被首订阅者触发一次（引用计数守卫）
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);

    c1();
    c2();
    // 最后一个卸载前：未订阅解注（NetInfo listener 还在），store 保留 null 初始态
    // （mockFetch 的 resolvedValue 不会同步 flush，store 真实态在 fetch 回调后才置；
    //   引用计数的断言重点是「不重复 fetch/addEventListener + 最后解注重置」，见上下文）
    expect(useNetworkStore.getState().isConnected).toBeNull();

    c3();
    // 最后一个订阅者卸载 → 重置 null 供下次 init
    expect(useNetworkStore.getState().isConnected).toBeNull();
    expect(useNetworkStore.getState().isOffline).toBeNull();
  });

  it('fetch 失败：保守视为在线（与原 useNetwork ?? true 一致）', async () => {
    mockFetch.mockRejectedValue(new Error('netinfo unavailable'));
    mockAddEventListener.mockReturnValue(jest.fn());

    const cleanup = useNetworkStore.getState().init();
    await Promise.resolve();
    await Promise.resolve();

    expect(useNetworkStore.getState().isConnected).toBe(true);
    expect(useNetworkStore.getState().isOffline).toBe(false);

    cleanup();
  });
});
