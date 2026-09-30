/**
 * 批3#11（批2 转办 P2-2）：SOLD_OUT 类确定性业务 4xx 失败不入离线队列。
 * useOfflineMutation 守卫依赖 err.name === 'BusinessError'——
 * service/hook 层（useCart.addToCart 库存校验、cartApi NO_SKU）现抛 businessError，
 * 守卫真实生效路径验证。
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { enqueue } from '@/services/offline/queue';
import { businessError } from '@/services/cart';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import { renderHook } from '@testing-library/react-native';

const QUEUE_KEY = 'meimart.offline-queue';

jest.mock('@/services/offline/queue', () => ({
  ...jest.requireActual('@/services/offline/queue'),
  enqueue: jest.fn().mockResolvedValue(undefined),
}));

const mockNetState = { isConnected: true as boolean | null };
jest.mock('@react-native-community/netinfo', () => ({
  default: { fetch: () => Promise.resolve(mockNetState), addEventListener: () => () => {} },
  fetch: () => Promise.resolve(mockNetState),
  addEventListener: () => () => {},
}));

const makeOp = (id: string) => ({
  id,
  type: 'add-to-cart' as const,
  payload: { productId: 'p1', quantity: 1 },
});

describe('批3#11 SOLD_OUT 业务 4xx 不入队', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.removeItem(QUEUE_KEY);
    mockNetState.isConnected = true;
  });

  it('useCart 抛的 SOLD_OUT（businessError）→ 不入队', async () => {
    const { result } = renderHook(() => useOfflineMutation());
    const handler = jest.fn().mockRejectedValue(businessError('SOLD_OUT'));
    const out = await result.current(makeOp('op-biz-1'), handler);
    expect(out.queued).toBe(false);
    expect((out.error as Error).name).toBe('BusinessError');
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('STOCK_EXCEEDED（businessError）→ 不入队', async () => {
    const { result } = renderHook(() => useOfflineMutation());
    const handler = jest.fn().mockRejectedValue(businessError('STOCK_EXCEEDED'));
    const out = await result.current(makeOp('op-biz-2'), handler);
    expect(out.queued).toBe(false);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('cartApi NO_SKU（businessError）→ 不入队', async () => {
    const { result } = renderHook(() => useOfflineMutation());
    const handler = jest.fn().mockRejectedValue(businessError('NO_SKU: p1'));
    const out = await result.current(makeOp('op-biz-3'), handler);
    expect(out.queued).toBe(false);
    expect(enqueue).not.toHaveBeenCalled();
  });
});
