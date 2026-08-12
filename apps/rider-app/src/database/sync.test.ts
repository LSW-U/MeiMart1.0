import { dispatchAction, processQueue, type QueueAction } from './sync';

import { taskApi } from '../services/task';

/**
 * sync 单测 —— CLAUDE.md 规则 12 离线队列消费器。
 *
 * 覆盖：
 *   - dispatchAction 路由（bug 1：端点对齐 taskApi 真实方法，POST /rider/dispatch/tasks/{id}/{...}）
 *   - processQueue 消费（bug 2：失败 attempts 必须 entry.update 持久化，直接改属性不落盘；
 *     bug 3：FIFO 按 createdAt 升序，保证 pickup -> deliver 业务顺序）
 *
 * fake database：mockFetch 让每个 test 动态配置 query().fetch() 返回值。
 * mock 前缀变量由 babel-plugin-jest-hoist 自动 hoist 到 jest.mock 之前，factory 内可安全引用。
 */

jest.mock('../services/task', () => ({
  taskApi: {
    pickup: jest.fn(),
    startDelivering: jest.fn(),
    deliver: jest.fn(),
  },
}));

// fake database：mockFetch 暴露给 processQueue test 配置 entries。
// dispatchAction 不碰 db；processQueue 通过 fetch 拿 entries 消费。
jest.mock('./index', () => ({
  database: {
    write: async (fn: () => Promise<void>) => fn(),
    get: () => ({
      create: async () => undefined,
      query: () => ({ fetch: mockFetch, fetchCount: async () => 0 }),
    }),
  },
}));

// mock 前缀 -> babel-plugin-jest-hoist 自动 hoist 到 jest.mock 之前，factory 可安全引用
const mockFetch = jest.fn();
const mockPickup = taskApi.pickup as jest.Mock;
const mockStartDelivering = taskApi.startDelivering as jest.Mock;
const mockDeliver = taskApi.deliver as jest.Mock;

/** fake OfflineQueueEntry：processQueue 只读 action/payload/attempts/createdAt + 调 markAsDeleted/update */
interface FakeEntry {
  createdAt: number;
  attempts: number;
  action: string;
  payload: string;
  lastError?: string;
  markAsDeleted: jest.Mock;
  update: jest.Mock;
}

function makeFakeEntry(opts: {
  action: QueueAction['type'];
  payload: QueueAction['payload'];
  attempts?: number;
  createdAt?: number;
}): FakeEntry {
  const entry: FakeEntry = {
    createdAt: opts.createdAt ?? 0,
    attempts: opts.attempts ?? 0,
    action: opts.action,
    payload: JSON.stringify(opts.payload),
    markAsDeleted: jest.fn().mockResolvedValue(undefined),
    // 模拟 WMB Model.update：执行回调，回调内改 record 属性即"落盘"
    update: jest.fn(async (fn: (r: FakeEntry) => void) => {
      fn(entry);
    }),
  };
  return entry;
}

describe('dispatchAction 路由（bug 1：端点对齐 taskApi 真实方法）', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockPickup.mockReset();
    mockStartDelivering.mockReset();
    mockDeliver.mockReset();
  });

  it('pickup -> taskApi.pickup(taskId, note)', async () => {
    mockPickup.mockResolvedValue(undefined);
    const action: QueueAction = { type: 'pickup', payload: { taskId: 'T1', note: 'arrived' } };

    await dispatchAction(action);

    expect(mockPickup).toHaveBeenCalledWith('T1', 'arrived');
    expect(mockStartDelivering).not.toHaveBeenCalled();
    expect(mockDeliver).not.toHaveBeenCalled();
  });

  it('startDelivering -> taskApi.startDelivering(taskId, note)', async () => {
    mockStartDelivering.mockResolvedValue(undefined);
    const action: QueueAction = { type: 'startDelivering', payload: { taskId: 'T2' } };

    await dispatchAction(action);

    expect(mockStartDelivering).toHaveBeenCalledWith('T2', undefined);
    expect(mockPickup).not.toHaveBeenCalled();
  });

  it('deliver -> taskApi.deliver(taskId, {collectedAmount, note})', async () => {
    mockDeliver.mockResolvedValue(undefined);
    const action: QueueAction = {
      type: 'deliver',
      payload: { taskId: 'T3', collectedAmount: 100, note: 'cash' },
    };

    await dispatchAction(action);

    expect(mockDeliver).toHaveBeenCalledWith('T3', { collectedAmount: 100, note: 'cash' });
    expect(mockPickup).not.toHaveBeenCalled();
  });
});

describe('processQueue 消费（bug 2 attempts 持久化 + bug 3 FIFO）', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockPickup.mockReset();
    mockStartDelivering.mockReset();
    mockDeliver.mockReset();
  });

  it('成功：dispatchAction 全过 -> 全 markAsDeleted，synced=N failed=0', async () => {
    const e1 = makeFakeEntry({ action: 'pickup', payload: { taskId: 'A' } });
    const e2 = makeFakeEntry({ action: 'startDelivering', payload: { taskId: 'B' } });
    mockFetch.mockResolvedValue([e1, e2]);
    mockPickup.mockResolvedValue(undefined);
    mockStartDelivering.mockResolvedValue(undefined);

    const result = await processQueue();

    expect(result).toEqual({ synced: 2, failed: 0 });
    expect(e1.markAsDeleted).toHaveBeenCalledTimes(1);
    expect(e2.markAsDeleted).toHaveBeenCalledTimes(1);
  });

  it('bug 3 FIFO：query 返回乱序，按 createdAt 升序重放', async () => {
    // 故意 createdAt 降序（A=3000, B=1000, C=2000），验证 sort 升序后才 for 循环
    const eA = makeFakeEntry({ action: 'pickup', payload: { taskId: 'A' }, createdAt: 3000 });
    const eB = makeFakeEntry({ action: 'pickup', payload: { taskId: 'B' }, createdAt: 1000 });
    const eC = makeFakeEntry({ action: 'pickup', payload: { taskId: 'C' }, createdAt: 2000 });
    mockFetch.mockResolvedValue([eA, eB, eC]);
    mockPickup.mockResolvedValue(undefined);

    await processQueue();

    // 期望重放顺序 B(1000) -> C(2000) -> A(3000)，保证 pickup -> deliver 业务顺序不乱
    expect(mockPickup.mock.calls.map((c) => c[0])).toEqual(['B', 'C', 'A']);
  });

  it('bug 2：失败用 entry.update 持久化 attempts+1 + lastError', async () => {
    const e1 = makeFakeEntry({ action: 'pickup', payload: { taskId: 'A' }, attempts: 0 });
    mockFetch.mockResolvedValue([e1]);
    mockPickup.mockRejectedValue(new Error('network down'));

    const result = await processQueue();

    expect(result).toEqual({ synced: 0, failed: 1 });
    // bug 2 核心：必须 entry.update 才落盘（旧代码直接 entry.attempts += 1 不持久化）
    expect(e1.update).toHaveBeenCalledTimes(1);
    expect(e1.attempts).toBe(1);
    expect(e1.lastError).toBe('network down');
    expect(e1.markAsDeleted).not.toHaveBeenCalled();
  });

  it('超 MAX_ATTEMPTS(5) 跳过：不调 dispatchAction，计入 failed', async () => {
    const e1 = makeFakeEntry({ action: 'pickup', payload: { taskId: 'A' }, attempts: 5 });
    mockFetch.mockResolvedValue([e1]);
    mockPickup.mockResolvedValue(undefined);

    const result = await processQueue();

    expect(result).toEqual({ synced: 0, failed: 1 });
    expect(mockPickup).not.toHaveBeenCalled();
    expect(e1.markAsDeleted).not.toHaveBeenCalled();
  });
});
