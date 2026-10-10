/**
 * B-P2-2（D2/D2b）: processQueue 错误分型三态测试
 *
 * - 4xx 业务拒绝（409/422 等）→ 死信移除，不再占队列
 * - 5xx / 网络错（无 status）→ 保留队列等下轮重放
 * - 401 → 先刷 token 重试一次：重试成功移除 / 重试仍 401 死信 / 刷新失败保留
 *
 * 口径对齐 rider sync.ts isPermanentStatus + retryAfterTokenRefresh（C17）先例。
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cartApi } from '@/services/cart';
import { enqueue, processQueue, getQueue, clearQueue, type QueueOperation } from '../queue';

const mockRefreshAccessToken = jest.fn();

jest.mock('@/services/api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
  isMockMode: false,
  refreshAccessToken: (...args: unknown[]) => mockRefreshAccessToken(...args),
}));

jest.mock('@/services/cart', () => ({
  cartApi: {
    addItemById: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
    toggleSelect: jest.fn(),
  },
}));

jest.mock('@/services/orders', () => ({
  orderApi: { cancelOrder: jest.fn() },
}));

jest.mock('@/store/appStore', () => ({
  useAppStore: { getState: () => ({ setPendingMutations: jest.fn() }) },
}));

const addItemById = cartApi.addItemById as jest.Mock;
const QUEUE_KEY = 'meimart.offline-queue';

function axiosError(status: number): Error {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status },
  });
}

function makeOp(id: string): QueueOperation {
  return { id, type: 'add-to-cart', payload: { productId: 'p001', quantity: 1 } };
}

describe('B-P2-2 processQueue 错误分型三态', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await clearQueue();
  });

  it('4xx（409）业务拒绝 → 死信移除（不重放）', async () => {
    addItemById.mockRejectedValue(axiosError(409));
    await enqueue(makeOp('op1'));

    const result = await processQueue();
    expect(result).toEqual({ ok: 1, failed: 0 }); // 死信计 ok（语义对齐 rider permanent）
    const remaining = await getQueue();
    expect(remaining).toHaveLength(0);
    expect(addItemById).toHaveBeenCalledTimes(1); // 不重试
  });

  it('422 同款死信；408/429/5xx/网络错保留重放', async () => {
    addItemById.mockRejectedValue(axiosError(422));
    await enqueue(makeOp('op-422'));
    expect(await processQueue()).toEqual({ ok: 1, failed: 0 });
    expect(await getQueue()).toHaveLength(0);

    for (const status of [408, 429, 500, 503]) {
      await clearQueue();
      addItemById.mockRejectedValue(axiosError(status));
      await enqueue(makeOp(`op-${status}`));
      expect(await processQueue()).toEqual({ ok: 0, failed: 1 });
      expect(await getQueue()).toHaveLength(1);
    }

    // 网络错（无 response.status）→ 保留重放
    await clearQueue();
    addItemById.mockRejectedValue(new Error('Network Error'));
    await enqueue(makeOp('op-net'));
    expect(await processQueue()).toEqual({ ok: 0, failed: 1 });
    expect(await getQueue()).toHaveLength(1);
  });

  it('401 → 刷 token 重试一次：重试成功移除', async () => {
    addItemById.mockRejectedValueOnce(axiosError(401)).mockResolvedValueOnce(undefined);
    mockRefreshAccessToken.mockResolvedValue('new-token');
    await enqueue(makeOp('op-401-retry'));

    const result = await processQueue();
    expect(mockRefreshAccessToken).toHaveBeenCalledTimes(1);
    expect(addItemById).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ ok: 1, failed: 0 });
    expect(await getQueue()).toHaveLength(0);
  });

  it('401 → 刷 token 后重试仍 401 → 死信', async () => {
    addItemById.mockRejectedValue(axiosError(401));
    mockRefreshAccessToken.mockResolvedValue('new-token');
    await enqueue(makeOp('op-401-still'));

    expect(await processQueue()).toEqual({ ok: 1, failed: 0 });
    expect(addItemById).toHaveBeenCalledTimes(2);
    expect(await getQueue()).toHaveLength(0);
  });

  it('401 → 刷新失败（无 refreshToken resolve null）→ 保留队列', async () => {
    addItemById.mockRejectedValue(axiosError(401));
    mockRefreshAccessToken.mockResolvedValue(null);
    await enqueue(makeOp('op-401-refresh-fail'));

    expect(await processQueue()).toEqual({ ok: 0, failed: 1 });
    expect(await getQueue()).toHaveLength(1);
  });

  it('队列空/全部成功：正常计数（回归）', async () => {
    expect(await processQueue()).toEqual({ ok: 0, failed: 0 });
    addItemById.mockResolvedValue(undefined);
    await enqueue(makeOp('op-ok'));
    expect(await processQueue()).toEqual({ ok: 1, failed: 0 });
    expect(await AsyncStorage.getItem(QUEUE_KEY)).toBe('[]');
  });
});
