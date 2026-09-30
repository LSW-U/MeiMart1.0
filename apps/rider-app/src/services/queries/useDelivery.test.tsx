/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';

import type { DeliveryTask } from '@/src/types/task';
import { deliveryApi } from '../delivery';
import { persistEvidencePhoto } from '../../services/evidence';
import { enqueue } from '../../database/sync';
import { useNetwork } from '../../hooks/useNetwork';
import { taskDetailKey, taskListsKey } from './useTask';
import type { TaskLists } from '../task';
import { makeTask } from '../__fixtures__/makeTask';
import { useConfirmDelivery, useConfirmPickup } from './useDelivery';

/**
 * useDelivery hooks 单测 —— CLAUDE.md 规则 12 离线入队（pickup/deliver 离线不丢）。
 *
 * 渲染方案同 useTask.test.tsx：web project（jsdom）+ @testing-library/react，详见
 * memory `rider-app-hooks-test-env-blockers`。jest.mock 隔离 delivery/sync/useNetwork/task。
 *
 * 关键断言：离线时 mutationFn 调 enqueue（不调真 API）+ resolve（不 reject）-> onMutate 乐观保留、
 * 不触发 onError rollback。在线时走 deliveryApi、不调 enqueue。
 */

jest.mock('../delivery', () => ({
  deliveryApi: {
    confirmPickup: jest.fn(),
    confirmDelivery: jest.fn(),
  },
}));

// useTask.ts 间接 import taskApi，mock 掉避免真 task.ts（含 mock layer + localStorage）加载。
// useDelivery.ts 只用 useTask 的 taskDetailKey/taskListsKey 常量（来自 ./useTask，非 ../task）。
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

jest.mock('../../database/sync', () => ({
  enqueue: jest.fn(),
}));

// R-P1-2：离线入队前证据落盘走 evidence 服务，mock 掉 expo-file-system 依赖
jest.mock('../../services/evidence', () => ({
  persistEvidencePhoto: jest.fn(),
}));

const mockPersistEvidencePhoto = persistEvidencePhoto as jest.Mock;

jest.mock('../../hooks/useNetwork', () => ({
  useNetwork: jest.fn(),
}));

const mockConfirmPickup = deliveryApi.confirmPickup as jest.Mock;
const mockConfirmDelivery = deliveryApi.confirmDelivery as jest.Mock;
const mockEnqueue = enqueue as jest.Mock;
const mockUseNetwork = useNetwork as jest.Mock;

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // gcTime: Infinity 防 seeded 但无 observer 的查询被 GC（useTask.test.tsx 同款配置）
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

describe('useConfirmPickup — 离线入队（CLAUDE.md 规则 12）', () => {
  let qc: QueryClient;
  beforeEach(() => {
    qc = createQueryClient();
    mockEnqueue.mockReset();
    mockConfirmPickup.mockReset();
    mockUseNetwork.mockReset();
    mockPersistEvidencePhoto.mockReset();
  });
  afterEach(() => {
    qc.clear();
  });

  it('离线：enqueue({type:pickup}) 被调 + 真 API 不调 + 乐观 cache 保留 PICKED_UP', async () => {
    mockUseNetwork.mockReturnValue({ isOffline: true });
    mockEnqueue.mockResolvedValue(undefined);
    mockPersistEvidencePhoto.mockResolvedValue('file://persisted/p1.jpg');
    const taskA = makeTask('ASSIGNED', { id: 'A' });
    qc.setQueryData(taskListsKey, { available: [], pickups: [taskA], deliveries: [] });
    qc.setQueryData(taskDetailKey('A'), taskA);

    const { result } = renderHook(() => useConfirmPickup(), { wrapper: makeWrapper(qc) });

    await act(async () => {
      await result.current.mutateAsync({ taskId: 'A', evidence: { photoUri: 'p' } });
    });

    // R-P1-2：photoUri 先落盘（persistEvidencePhoto），持久路径进 payload.evidence
    expect(mockPersistEvidencePhoto).toHaveBeenCalledWith('p');
    expect(mockEnqueue).toHaveBeenCalledWith({
      type: 'pickup',
      payload: { taskId: 'A', evidence: { photoUri: 'file://persisted/p1.jpg' } },
    });
    expect(mockConfirmPickup).not.toHaveBeenCalled();
    // 乐观 cache 保留（onMutate 置 PICKED_UP，离线 resolve 不触发 onError rollback）
    const lists = qc.getQueryData<TaskLists>(taskListsKey);
    expect(lists?.pickups[0].status).toBe('PICKED_UP');
    const detail = qc.getQueryData<DeliveryTask>(taskDetailKey('A'));
    expect(detail?.status).toBe('PICKED_UP');
  });

  it('离线 + doorUri：doorUri 也落盘并进 payload.evidence（R-P1-2：恢复后上传）', async () => {
    mockUseNetwork.mockReturnValue({ isOffline: true });
    mockEnqueue.mockResolvedValue(undefined);
    mockPersistEvidencePhoto.mockResolvedValue('file://persisted/d1.jpg');
    const taskA = makeTask('ASSIGNED', { id: 'A' });
    qc.setQueryData(taskListsKey, { available: [], pickups: [taskA], deliveries: [] });
    qc.setQueryData(taskDetailKey('A'), taskA);

    const { result } = renderHook(() => useConfirmPickup(), { wrapper: makeWrapper(qc) });

    await act(async () => {
      await result.current.mutateAsync({ taskId: 'A', evidence: { doorUri: 'd' } });
    });

    expect(mockEnqueue).toHaveBeenCalledWith({
      type: 'pickup',
      payload: { taskId: 'A', evidence: { doorUri: 'file://persisted/d1.jpg' } },
    });
  });

  it('离线 + 无 evidence：不调 persistEvidencePhoto，payload 不带 evidence 字段', async () => {
    mockUseNetwork.mockReturnValue({ isOffline: true });
    mockEnqueue.mockResolvedValue(undefined);
    mockPersistEvidencePhoto.mockResolvedValue('file://persisted/x.jpg');
    const taskA = makeTask('ASSIGNED', { id: 'A' });
    qc.setQueryData(taskListsKey, { available: [], pickups: [taskA], deliveries: [] });

    const { result } = renderHook(() => useConfirmPickup(), { wrapper: makeWrapper(qc) });

    await act(async () => {
      await result.current.mutateAsync({ taskId: 'A' });
    });

    expect(mockPersistEvidencePhoto).not.toHaveBeenCalled();
    expect(mockEnqueue).toHaveBeenCalledWith({
      type: 'pickup',
      payload: { taskId: 'A' },
    });
  });

  it('在线：走 deliveryApi.confirmPickup，不入队', async () => {
    mockUseNetwork.mockReturnValue({ isOffline: false });
    mockConfirmPickup.mockResolvedValue(undefined);
    const taskA = makeTask('ASSIGNED', { id: 'A' });
    qc.setQueryData(taskListsKey, { available: [], pickups: [taskA], deliveries: [] });

    const { result } = renderHook(() => useConfirmPickup(), { wrapper: makeWrapper(qc) });

    await act(async () => {
      await result.current.mutateAsync({ taskId: 'A' });
    });

    expect(mockConfirmPickup).toHaveBeenCalledWith('A', undefined);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });
});

describe('useConfirmDelivery — 离线入队（CLAUDE.md 规则 12）', () => {
  let qc: QueryClient;
  beforeEach(() => {
    qc = createQueryClient();
    mockEnqueue.mockReset();
    mockConfirmDelivery.mockReset();
    mockUseNetwork.mockReset();
    mockPersistEvidencePhoto.mockReset();
  });
  afterEach(() => {
    qc.clear();
  });

  it('离线：enqueue({type:deliver}) 被调 + cache 保留（审查 S1：不读 detail、不返回 task）', async () => {
    mockUseNetwork.mockReturnValue({ isOffline: true });
    mockEnqueue.mockResolvedValue(undefined);
    const taskA = makeTask('PICKED_UP', { id: 'A', taskType: 'return' });
    qc.setQueryData(taskListsKey, { available: [], pickups: [taskA], deliveries: [] });
    qc.setQueryData(taskDetailKey('A'), taskA);

    const { result } = renderHook(() => useConfirmDelivery(), { wrapper: makeWrapper(qc) });

    await act(async () => {
      await result.current.mutateAsync({ taskId: 'A' });
    });

    expect(mockEnqueue).toHaveBeenCalledWith({
      type: 'deliver',
      payload: { taskId: 'A' },
    });
    expect(mockPersistEvidencePhoto).not.toHaveBeenCalled();
    expect(mockConfirmDelivery).not.toHaveBeenCalled();
    // 乐观 cache 保留（onMutate 置 DELIVERED，离线 resolve 不触发 onError rollback）
    const detail = qc.getQueryData<DeliveryTask>(taskDetailKey('A'));
    expect(detail?.status).toBe('DELIVERED');
  });
});
