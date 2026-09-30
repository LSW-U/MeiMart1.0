/**
 * @jest-environment jsdom
 */
import * as Location from 'expo-location';
import { act, renderHook, waitFor } from '@testing-library/react';

import { useLocation } from '../../hooks/useLocation';
import { useLocationStore } from '../../store/useLocationStore';

/**
 * useLocation 单测（批2 R-P1-4 回归，报告 §5 两个样例）：
 *
 * 1. R-P1-1 保活回归：enabled 基于 online!==false，settings 失败 online=null →
 *    enabled=true，watch 必须启动（null 不停 GPS）。
 * 2. R-P1-4 泄漏回归：await watchPositionAsync 期间卸载 → 订阅必须被 remove
 *    （原实现 subRef.current = await ...，卸载清理先跑、订阅后挂 → 永久泄漏）。
 * 3. R-P1-4 重启风暴回归：socket 引用变化不再重启 watch（effect 依赖只剩 enabled/hasOrderId）。
 *
 * expo-location mock（rn project 无原生 runtime；watchPositionAsync 返回可 remove 的 stub）。
 */

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getLastKnownPositionAsync: jest.fn(async () => null),
  watchPositionAsync: jest.fn(),
  Accuracy: { High: 4, Balanced: 3 },
}));

/** 测试桩用 socket 最小结构类型（仅 useLocation 消费的 connected/emit 字段） */
type SocketType = { connected: boolean; emit: jest.Mock };
// useLocation 真签名是 socket.io Socket——测试传桩对象需经 as unknown 断言到桩类型（仅消费两字段，缺其余成员）
const asStubSocket = (s: SocketType) => s as unknown as Parameters<typeof useLocation>[0]['socket'];

const mockWatch = Location.watchPositionAsync as jest.Mock;

function makeSubscription() {
  const sub = { remove: jest.fn() };
  return sub;
}

describe('useLocation（批2 R-P1-4 回归）', () => {
  beforeEach(() => {
    mockWatch.mockReset();
  });

  it('R-P1-1 保活：enabled=true（online=null 映射后）启动 watch——settings 失败不停 GPS', async () => {
    const sub = makeSubscription();
    mockWatch.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 0));
      return sub;
    });

    renderHook(() => useLocation({ socket: null, enabled: true }));

    await waitFor(() => expect(mockWatch).toHaveBeenCalledTimes(1));
  });

  it('R-P1-1 守卫：enabled=false（明确 offDuty）不启动 watch', () => {
    renderHook(() => useLocation({ socket: null, enabled: false }));
    expect(mockWatch).not.toHaveBeenCalled();
  });

  it('R-P1-4 泄漏：await watchPositionAsync 期间卸载 → 订阅被 remove（不挂上）', async () => {
    const sub = makeSubscription();
    // 挂起 promise 模拟慢的 watchPositionAsync（卸载发生在 await 期间）
    let resolveWatch: (s: unknown) => void = () => {};
    mockWatch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveWatch = resolve;
        }),
    );

    const { unmount } = renderHook(() => useLocation({ socket: null, enabled: true }));
    // 等 effect 已启动（进入 await watchPositionAsync），再卸载
    await waitFor(() => expect(mockWatch).toHaveBeenCalledTimes(1));
    unmount();
    await act(async () => {
      resolveWatch(sub);
    });

    // 泄漏回归核心断言：迟到的订阅必须立即 remove，不得挂到 subRef 上继续上报
    expect(sub.remove).toHaveBeenCalled();
  });

  it('R-P1-4 重启风暴：socket 引用变化不重启 watch（不触发 effect 重跑）', async () => {
    const sub = makeSubscription();
    mockWatch.mockResolvedValue(sub);

    const socketA = asStubSocket({ connected: true, emit: jest.fn() });
    const socketB = asStubSocket({ connected: true, emit: jest.fn() });
    const { rerender } = renderHook(
      ({ socket }: { socket: ReturnType<typeof asStubSocket> }) =>
        useLocation({ socket, enabled: true }),
      { initialProps: { socket: socketA } },
    );
    await waitFor(() => expect(mockWatch).toHaveBeenCalledTimes(1));

    // useRiderSocket setState 产生新 socket 引用——原实现会重启 watch，ref 化后不重启
    rerender({ socket: socketB });
    expect(mockWatch).toHaveBeenCalledTimes(1);
  });

  it('watch 回调：坐标直写 useLocationStore + socket.connected 时 emit location:update', async () => {
    let callback: ((loc: unknown) => void) | null = null;
    const sub = makeSubscription();
    mockWatch.mockImplementation(async (_opts, cb) => {
      callback = cb;
      return sub;
    });

    const emit = jest.fn();
    const socket = asStubSocket({ connected: true, emit });
    renderHook(() => useLocation({ socket, currentOrderId: 'O1', enabled: true }));
    await waitFor(() => expect(callback).not.toBeNull());

    const coords = { latitude: -8.55, longitude: 125.56, speed: 2, heading: 90 };
    await act(async () => {
      callback!({ coords });
    });

    const store = useLocationStore.getState().coordinates;
    expect(store.latitude).toBe(-8.55);
    expect(emit).toHaveBeenCalledWith(
      'location:update',
      expect.objectContaining({ orderId: 'O1' }),
    );
  });
});
