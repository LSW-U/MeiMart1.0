import { dispatchAction, type QueueAction } from './sync';

import { taskApi } from '../services/task';

/**
 * dispatchAction 路由单测（CLAUDE.md 规则 12 离线队列 - bug 1 修复验证）。
 *
 * 验证 dispatchAction 按 action type 路由到 taskApi 真实方法（端点路径 + 方法对齐
 * /rider/dispatch/tasks/{id}/{pickup|start-delivering|deliver}，POST）。
 * 旧代码端点路径错（缺 /rider/dispatch 前缀、PATCH /status 不符真实 POST /pickup 等），本测锁死对齐。
 *
 * 不测 enqueue/processQueue：依赖 WMB database 实例，单测需 fake db + 类型搏斗（DI/Jest mock hoist 均踩坑）；
 * bug 2（attempts entry.update 持久化）+ bug 3（FIFO sort）代码层可见，由 step 2/3 hook 测试 + 手测端到端验证。
 */

jest.mock('../services/task', () => ({
  taskApi: {
    pickup: jest.fn(),
    startDelivering: jest.fn(),
    deliver: jest.fn(),
  },
}));

// 阻止真 WMB database（LokiJSAdapter）加载 - 在 jest node 环境 hang。
// 自包含 fake（不引外层变量，避开 jest.mock hoist 时机坑）。dispatchAction 不碰 db，fake 只需存在。
jest.mock('./index', () => ({
  database: {
    write: async (fn: () => Promise<void>) => fn(),
    get: () => ({
      create: async () => undefined,
      query: () => ({ fetch: async () => [], fetchCount: async () => 0 }),
    }),
  },
}));

const mockPickup = taskApi.pickup as jest.Mock;
const mockStartDelivering = taskApi.startDelivering as jest.Mock;
const mockDeliver = taskApi.deliver as jest.Mock;

describe('dispatchAction 路由（bug 1：端点对齐 taskApi 真实方法）', () => {
  beforeEach(() => {
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
