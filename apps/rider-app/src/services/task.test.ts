import type { DeliveryTask } from '@/src/types/task';

import { api, buildQuery } from './api';
import { taskApi } from './task';
import { makeTask } from './__fixtures__/makeTask';

/**
 * taskApi.getLists 单测 —— 核心验证 S2 弱网降级（CLAUDE.md 规则 11-14）：
 * 双端点（抢单大厅 tasks + 我的任务 my-tasks）用 Promise.allSettled 并发，
 * my-tasks 失败时降级到空数组（pickups/deliveries 暂空，available 仍展示），
 * pending 失败则 throw（抢单大厅是硬伤，骑手没法工作）。
 *
 * 只测 real 模式分支（isMockMode=false）；mock 分支涉及 setTimeout/localStorage，
 * dev-only 价值低，留作未来加 fake timers 时补。
 */

// Mock ./api：只 stub getLists 用到的 api.get + buildQuery，isMockMode 固定 false
// （测真实双端点路径）。factory 不引用外层变量，仅用 jest.fn（jest.mock 工厂约束）。
jest.mock('./api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
  buildQuery: jest.fn(
    (params: Record<string, string> = {}) =>
      Object.keys(params).length === 0
        ? ''
        : '?' +
          Object.entries(params)
            .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
            .join('&'),
  ),
  isMockMode: false,
}));

// 运行时 api.get / buildQuery 即 factory 的 jest.fn；用 jest.Mock 收窄断言，
// 不走断言逃逸（CLAUDE.md 规则 30 禁止断言绕过 strict 检查）。jest.Mock 解析为宽松签名，mockResolvedValue 接受部分 fixture。
const mockGet = api.get as jest.Mock;
const mockBuildQuery = buildQuery as jest.Mock;

describe('taskApi.getLists', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockBuildQuery.mockClear();
  });

  it('双端点成功 → 按 status 分桶到 available/pickups/deliveries', async () => {
    const pending: DeliveryTask[] = [
      makeTask('PENDING_ASSIGN', { id: 'p1' }),
      makeTask('PENDING_ASSIGN', { id: 'p2' }),
    ];
    const mine: DeliveryTask[] = [
      makeTask('ASSIGNED', { id: 'a1' }),
      makeTask('PICKED_UP', { id: 'a2' }),
      makeTask('DELIVERING', { id: 'd1' }),
      // 终态任务不应出现在任何桶里（后端 my-tasks 不应返回，但前端过滤兜底）
      makeTask('DELIVERED', { id: 'done' }),
    ];
    mockGet.mockImplementation((url: string) =>
      url.includes('my-tasks')
        ? Promise.resolve({ data: { items: mine } })
        : Promise.resolve({ data: { items: pending } }),
    );

    const lists = await taskApi.getLists();

    expect(lists.available.map((t) => t.id)).toEqual(['p1', 'p2']);
    expect(lists.pickups.map((t) => t.id)).toEqual(['a1', 'a2']);
    expect(lists.deliveries.map((t) => t.id)).toEqual(['d1']);
  });

  it('S2 弱网降级：my-tasks 失败 → pickups/deliveries 落空，available 仍展示 + warn', async () => {
    mockGet.mockImplementation((url: string) =>
      url.includes('my-tasks')
        ? Promise.reject(new Error('my-tasks network down'))
        : Promise.resolve({
            data: { items: [makeTask('PENDING_ASSIGN', { id: 'p1' })] },
          }),
    );
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const lists = await taskApi.getLists();

    expect(lists.available.map((t) => t.id)).toEqual(['p1']);
    expect(lists.pickups).toEqual([]);
    expect(lists.deliveries).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('my-tasks failed'),
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });

  it('pending 端点失败 → throw（抢单大厅是硬伤，UI 应显示错误重试）', async () => {
    mockGet.mockImplementation((url: string) =>
      url.includes('my-tasks')
        ? Promise.resolve({ data: { items: [] } })
        : Promise.reject(new Error('pending down')),
    );

    await expect(taskApi.getLists()).rejects.toThrow('pending down');
  });

  it('传 warehouseId → buildQuery 收到 {warehouseId}', async () => {
    mockGet.mockResolvedValue({ data: { items: [] } });

    await taskApi.getLists('wh-99');

    expect(mockBuildQuery).toHaveBeenCalledWith({ warehouseId: 'wh-99' });
  });

  it('不传 warehouseId → buildQuery 收到 {}（不附加 query string）', async () => {
    mockGet.mockResolvedValue({ data: { items: [] } });

    await taskApi.getLists();

    expect(mockBuildQuery).toHaveBeenCalledWith({});
  });
});
