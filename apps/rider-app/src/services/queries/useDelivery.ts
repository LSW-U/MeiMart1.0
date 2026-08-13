import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { enqueue } from '@/src/database/sync';
import { useNetwork } from '@/src/hooks/useNetwork';
import { deliveryApi, type DeliveryEvidence } from '../delivery';
import type { DeliveryTask, TaskStatus } from '@/src/types/task';
import { taskDetailKey, taskListsKey } from './useTask';
import type { TaskLists } from '../task';

// 乐观更新 taskLists + taskDetail cache 的 status（pickup/deliver 共用）
// 返回 previous 供 onError rollback
async function applyOptimisticStatus(
  queryClient: QueryClient,
  taskId: string,
  status: TaskStatus,
) {
  await queryClient.cancelQueries({ queryKey: taskListsKey });
  const previousLists = queryClient.getQueryData<TaskLists>(taskListsKey);
  if (previousLists) {
    const updateList = (list: DeliveryTask[]) =>
      list.map((t) => (t.id === taskId ? { ...t, status } : t));
    queryClient.setQueryData<TaskLists>(taskListsKey, {
      available: updateList(previousLists.available),
      pickups: updateList(previousLists.pickups),
      deliveries: updateList(previousLists.deliveries),
    });
  }
  const detailKey = taskDetailKey(taskId);
  await queryClient.cancelQueries({ queryKey: detailKey });
  const previousDetail = queryClient.getQueryData<DeliveryTask | null>(detailKey);
  queryClient.setQueryData<DeliveryTask | null>(detailKey, (old) =>
    old ? { ...old, status } : old,
  );
  return { previousLists, previousDetail, detailKey };
}

function rollbackOptimistic(
  queryClient: QueryClient,
  ctx: Awaited<ReturnType<typeof applyOptimisticStatus>>,
) {
  if (ctx.previousLists) queryClient.setQueryData(taskListsKey, ctx.previousLists);
  if (ctx.previousDetail !== undefined) {
    queryClient.setQueryData(ctx.detailKey, ctx.previousDetail);
  }
}

// CLAUDE.md rider 弱网规则 #12：pickup 乐观更新（ASSIGNED→PICKED_UP），失败 rollback。
// Why: 原仅 onSettled invalidate，pickup 成功后到 refetch 完成前 cache 仍是 ASSIGNED，
//   detail/navigate 读到旧值 → 按钮显示 arrivedPickup + 跳 pickup 要求重新取货（06f5a9d5 实证）。
export function useConfirmPickup() {
  const queryClient = useQueryClient();
  const { isOffline } = useNetwork();
  return useMutation({
    mutationFn: async (params: { taskId: string; evidence?: DeliveryEvidence }) => {
      // CLAUDE.md 规则 12：离线入队，恢复后 processQueue 重放真 API。
      // resolve（不 reject）保留 onMutate 乐观，避免 onError rollback 撤销用户操作。
      if (isOffline) {
        await enqueue({
          type: 'pickup',
          payload: {
            taskId: params.taskId,
          },
        });
        return;
      }
      return deliveryApi.confirmPickup(params.taskId, params.evidence);
    },
    onMutate: async (variables) =>
      applyOptimisticStatus(queryClient, variables.taskId, 'PICKED_UP'),
    onError: (_err, _variables, ctx) => {
      if (ctx) rollbackOptimistic(queryClient, ctx);
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: taskListsKey });
      void queryClient.invalidateQueries({ queryKey: taskDetailKey(variables.taskId) });
    },
  });
}

// 同 useConfirmPickup：送达乐观更新（PICKED_UP/DELIVERING→DELIVERED）
export function useConfirmDelivery() {
  const queryClient = useQueryClient();
  const { isOffline } = useNetwork();
  return useMutation({
    mutationFn: async (params: { taskId: string; evidence?: DeliveryEvidence }) => {
      // CLAUDE.md 规则 12：离线入队。onMutate 已置 detail cache 为 DELIVERED，这里读回构造乐观 task。
      // detail 缺失（边缘，sign 页 useTask 已加载）不入队、throw -> onError rollback，避免队列/UI 不一致。
      // 审查 S1：离线直接 enqueue + return（对齐 pickup），不读 detail、不 throw。
      // enqueue 只需 taskId；detail 缺失 throw 会触发 onError rollback 撤销 onMutate 乐观、丢失操作。
      if (isOffline) {
        await enqueue({ type: 'deliver', payload: { taskId: params.taskId } });
        return;
      }
      return deliveryApi.confirmDelivery(params.taskId, params.evidence);
    },
    onMutate: async (variables) =>
      applyOptimisticStatus(queryClient, variables.taskId, 'DELIVERED'),
    onError: (_err, _variables, ctx) => {
      if (ctx) rollbackOptimistic(queryClient, ctx);
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: taskListsKey });
      void queryClient.invalidateQueries({ queryKey: taskDetailKey(variables.taskId) });
    },
  });
}
