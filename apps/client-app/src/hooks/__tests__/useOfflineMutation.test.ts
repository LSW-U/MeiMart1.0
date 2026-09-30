/**
 * C-P2-13: useOfflineMutation 在线判据三态一致 + 失败入队不静默丢操作
 *
 * - isConnected=false → 离线入队
 * - isConnected=true/null（未知，C-P2-12 同口径）→ 在线直发；直发失败入队重试
 * - 业务性拒绝（error.name === 'BusinessError'）不入队（重试也不会成功）
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { enqueue } from '@/services/offline/queue';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import { renderHook } from '@testing-library/react-native';

const QUEUE_KEY = 'meimart.offline-queue';

jest.mock('@/services/offline/queue', () => ({
  ...jest.requireActual('@/services/offline/queue'),
  enqueue: jest.fn().mockResolvedValue(undefined),
}));

// netinfo.fetch 可控 mock（factory 内 whitelist 前缀）
const mockNetState = {
  isConnected: true as boolean | null,
  isInternetReachable: true as boolean | null,
};
jest.mock('@react-native-community/netinfo', () => ({
  default: {
    fetch: () => Promise.resolve(mockNetState),
    addEventListener: () => () => {},
  },
  fetch: () => Promise.resolve(mockNetState),
  addEventListener: () => () => {},
}));

const makeOp = (id: string) => ({
  id,
  type: 'add-to-cart' as const,
  payload: { productId: 'p1', quantity: 1 },
});

describe('C-P2-13 useOfflineMutation', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.removeItem(QUEUE_KEY);
    mockNetState.isConnected = true;
    mockNetState.isInternetReachable = true;
  });

  it('在线（isConnected=true）：直发成功 → 不入队', async () => {
    const { result } = renderHook(() => useOfflineMutation());
    const handler = jest.fn().mockResolvedValue(undefined);
    const out = await result.current(makeOp('op1'), handler);
    expect(out.queued).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('离线（isConnected=false）：入队（操作不丢）', async () => {
    mockNetState.isConnected = false;
    const { result } = renderHook(() => useOfflineMutation());
    const handler = jest.fn();
    const out = await result.current(makeOp('op2'), handler);
    expect(out.queued).toBe(true);
    expect(handler).not.toHaveBeenCalled();
    expect(enqueue).toHaveBeenCalledWith(makeOp('op2'));
  });

  it('未知态（isConnected=null）按在线处理（C-P2-12 同口径）→ 直发', async () => {
    mockNetState.isConnected = null;
    const { result } = renderHook(() => useOfflineMutation());
    const handler = jest.fn().mockResolvedValue(undefined);
    const out = await result.current(makeOp('op3'), handler);
    expect(out.queued).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('在线直发失败（网络/5xx）→ 入队重试，不静默丢操作', async () => {
    const { result } = renderHook(() => useOfflineMutation());
    const handler = jest.fn().mockRejectedValue(new Error('Network Error'));
    const out = await result.current(makeOp('op4'), handler);
    expect(out.queued).toBe(true);
    expect(out.error).toBeDefined();
    expect(enqueue).toHaveBeenCalledWith(makeOp('op4'));
  });

  it('业务性拒绝（name=BusinessError，如 SOLD_OUT）→ 不入队（重试无意义）', async () => {
    const { result } = renderHook(() => useOfflineMutation());
    const bizError = new Error('SOLD_OUT');
    bizError.name = 'BusinessError';
    const handler = jest.fn().mockRejectedValue(bizError);
    const out = await result.current(makeOp('op5'), handler);
    expect(out.queued).toBe(false);
    expect(out.error).toBe(bizError);
    expect(enqueue).not.toHaveBeenCalled();
  });
});
