/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';

import type { DeliveryTask } from '@/src/types/task';
import type { TaskLists } from '../task';
import { taskApi } from '../task';
import { makeTask } from '../__fixtures__/makeTask';
import { taskDetailKey, taskListsKey, useAcceptTask, useStartDelivering } from './useTask';

/**
 * useTask hooks 单测 —— 聚焦 P14 ④ B1 乐观更新 + rollback（最易回归的逻辑）。
 *
 * 渲染方案：`@testing-library/react`（web）+ `@jest-environment jsdom`。
 * 不走 @testing-library/react-native 的 renderHook（v14 是 async，在本 jest-expo + React 19 挂死，
 * 见 memory `rider-app-hooks-test-env-blockers`）。web renderHook 是同步的，且 QueryClientProvider
 * 是纯 React 上下文，不需 RN 渲染器。jest.mock('../task') 隔离整个 service 层，运行时不加载任何 RN 模块。
 *
 * 设计要点：
 *   - 只挂 mutation hook 本身（不挂 useTaskLists）—— onSettled 的 invalidateQueries 无活跃 observer，
 *     不会 refetch 覆盖乐观/回滚态，可干净断言 cache。
 *   - 乐观测试用 deferred Promise：先断言 onMutate 中间态，再 resolve 让 onSettled 跑完（避免 pending 挂 jest）。
 *   - rollback 测试用 mutateAsync + try/catch，await 后 onError + onSettled 已跑完。
 *   - jest-friendly QueryClient：retry false / gcTime 0 / staleTime 0。
 */

jest.mock('../task', () => ({
  taskApi: {
    accept: jest.fn(),
    startDelivering: jest.fn(),
    getLists: jest.fn(),
    getById: jest.fn(),
    pickup: jest.fn(),
    deliver: jest.fn(),
    reportIssue: jest.fn(),
    hasActive: jest.fn(),
  },
}));
// useTask.ts 顶层 import useNetwork + enqueue（useStartDelivering 离线入队用），
// mock 掉避免真 NetInfo（ESM）+ 真 WMB database 在 jsdom 加载失败/hang。
// useStartDelivering 在线测试默认 isOffline=false，走真 taskApi.startDelivering 分支。
jest.mock('../../hooks/useNetwork', () => ({
  useNetwork: () => ({ isOffline: false }),
}));
jest.mock('../../database/sync', () => ({
  enqueue: jest.fn(),
}));

const mockAccept = taskApi.accept as jest.Mock;
const mockStartDelivering = taskApi.startDelivering as jest.Mock;

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // gcTime: Infinity 防止 seeded 但无 observer 的查询被 GC（onMutate 多 await 窗口期 seed 会被清掉）
      queries: { retry: false, gcTime: Infinity, staleTime: 0, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function seedLists(qc: QueryClient, lists: TaskLists) {
  qc.setQueryData(taskListsKey, lists);
}
function readLists(qc: QueryClient): TaskLists | undefined {
  return qc.getQueryData<TaskLists>(taskListsKey);
}

describe('useAcceptTask', () => {
  let qc: QueryClient;
  beforeEach(() => {
    qc = createQueryClient();
    mockAccept.mockReset();
  });
  afterEach(() => {
    qc.clear();
  });

  it('onMutate 乐观：accept 调用瞬间 task 从 available 移到 pickups（status=ASSIGNED）', async () => {
    const taskA = makeTask('PENDING_ASSIGN', { id: 'A' });
    seedLists(qc, { available: [taskA], pickups: [], deliveries: [] });
    // deferred：先捕获 onMutate 乐观中间态，再 resolve 让 mutation 走完 onSettled（避免 pending 挂 jest）
    let resolveAccept!: (v: DeliveryTask) => void;
    mockAccept.mockReturnValue(
      new Promise<DeliveryTask>((r) => {
        resolveAccept = r;
      }),
    );

    const { result } = renderHook(() => useAcceptTask(), { wrapper: makeWrapper(qc) });

    await act(async () => {
      result.current.mutate('A');
    });

    // 乐观中间态：accept 还没 resolve，task 已移到 pickups
    expect(readLists(qc)).toEqual({
      available: [],
      pickups: [{ ...taskA, status: 'ASSIGNED' }],
      deliveries: [],
    });

    // resolve 让 mutation 走完 onSettled（无 observer 不 refetch），避免 pending 挂 jest
    await act(async () => {
      resolveAccept({ ...taskA, status: 'ASSIGNED' });
      await Promise.resolve();
    });
  });

  it('onError rollback：accept 失败 -> 缓存还原到 available', async () => {
    const taskA = makeTask('PENDING_ASSIGN', { id: 'A' });
    seedLists(qc, { available: [taskA], pickups: [], deliveries: [] });
    mockAccept.mockRejectedValue(new Error('accept 409'));

    const { result } = renderHook(() => useAcceptTask(), { wrapper: makeWrapper(qc) });

    await act(async () => {
      try {
        await result.current.mutateAsync('A');
      } catch {
        // 预期 reject
      }
    });

    expect(readLists(qc)).toEqual({
      available: [taskA],
      pickups: [],
      deliveries: [],
    });
  });

  it('onMutate 边界：accept 的 task 不在缓存时不崩，lists 保持原样（审查 C4）', async () => {
    const taskA = makeTask('PENDING_ASSIGN', { id: 'A' });
    seedLists(qc, { available: [taskA], pickups: [], deliveries: [] });
    let resolveAccept!: (v: DeliveryTask) => void;
    mockAccept.mockReturnValue(
      new Promise<DeliveryTask>((r) => {
        resolveAccept = r;
      }),
    );

    const { result } = renderHook(() => useAcceptTask(), { wrapper: makeWrapper(qc) });

    // accept('B')，B 不在 available 缓存
    await act(async () => {
      result.current.mutate('B');
    });

    // onMutate find available 无 B -> setQueryData 不调用，lists 不变（A 仍在 available）
    expect(readLists(qc)).toEqual({
      available: [taskA],
      pickups: [],
      deliveries: [],
    });

    await act(async () => {
      resolveAccept({ ...taskA, id: 'B', status: 'ASSIGNED' });
      await Promise.resolve();
    });
  });
});

describe('useStartDelivering', () => {
  let qc: QueryClient;
  beforeEach(() => {
    qc = createQueryClient();
    mockStartDelivering.mockReset();
  });
  afterEach(() => {
    qc.clear();
  });

  it('onMutate 乐观：lists + detail 同步置 DELIVERING', async () => {
    const taskA = makeTask('PICKED_UP', { id: 'A', taskType: 'return' });
    seedLists(qc, { available: [], pickups: [taskA], deliveries: [] });
    qc.setQueryData(taskDetailKey('A'), taskA);
    let resolveStart!: (v: DeliveryTask) => void;
    mockStartDelivering.mockReturnValue(
      new Promise<DeliveryTask>((r) => {
        resolveStart = r;
      }),
    );

    const { result } = renderHook(() => useStartDelivering(), { wrapper: makeWrapper(qc) });

    await act(async () => {
      result.current.mutate('A');
    });

    // 审查 C3/N3 方案 A：跨 list（pickups → deliveries），task 从 pickups 移到 deliveries
    const lists = readLists(qc);
    expect(lists?.pickups).toHaveLength(0);
    expect(lists?.deliveries).toHaveLength(1);
    expect(lists?.deliveries[0].id).toBe('A');
    expect(lists?.deliveries[0].status).toBe('DELIVERING');
    const detail = qc.getQueryData<DeliveryTask>(taskDetailKey('A'));
    expect(detail?.status).toBe('DELIVERING');

    await act(async () => {
      resolveStart({ ...taskA, status: 'DELIVERING' });
      await Promise.resolve();
    });
  });

  it('onError rollback：startDelivering 失败 -> lists + detail 还原 PICKED_UP', async () => {
    const taskA = makeTask('PICKED_UP', { id: 'A', taskType: 'return' });
    seedLists(qc, { available: [], pickups: [taskA], deliveries: [] });
    qc.setQueryData(taskDetailKey('A'), taskA);
    mockStartDelivering.mockRejectedValue(new Error('E-DISPATCH-020'));

    const { result } = renderHook(() => useStartDelivering(), { wrapper: makeWrapper(qc) });

    await act(async () => {
      try {
        await result.current.mutateAsync('A');
      } catch {
        // 预期 reject
      }
    });

    const lists = readLists(qc);
    expect(lists?.pickups).toHaveLength(1);
    expect(lists?.pickups[0].status).toBe('PICKED_UP');
    expect(lists?.deliveries).toHaveLength(0);
    const detail = qc.getQueryData<DeliveryTask>(taskDetailKey('A'));
    expect(detail?.status).toBe('PICKED_UP');
  });
});

