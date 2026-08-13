import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { enqueue } from '@/src/database/sync';
import { useNetwork } from '@/src/hooks/useNetwork';
import type { DeliveryTask, TaskStatus } from '@/src/types/task';

import { taskApi } from '../task';
import type { TaskLists } from '../task';

export const taskListsKey = ['tasks', 'lists'] as const;

export function taskDetailKey(id: string) {
  return ['tasks', 'detail', id] as const;
}

export function useTaskLists() {
  return useQuery({
    queryKey: taskListsKey,
    queryFn: () => taskApi.getLists(),
  });
}

export function useTask(id: string | undefined) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: id ? taskDetailKey(id) : ['tasks', 'detail', 'none'],
    queryFn: async (): Promise<DeliveryTask | null> => {
      const taskId = id;
      if (!taskId) return null;
      // S3: 优先读 lists 缓存（getLists 已含所有任务），命中避免双端点全量拉取
      const lists = queryClient.getQueryData<TaskLists>(taskListsKey);
      if (lists) {
        const found =
          lists.available.find((t) => t.id === taskId) ??
          lists.pickups.find((t) => t.id === taskId) ??
          lists.deliveries.find((t) => t.id === taskId) ??
          null;
        if (found) return found;
      }
      // 未命中缓存才 fallback 到 getById（后端无单任务详情端点，走 getLists 派生）
      return taskApi.getById(taskId);
    },
    enabled: Boolean(id),
  });
}

export function useAcceptTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskApi.accept(id),
    onMutate: async (id) => {
      // 乐观更新：从 available 移到 pickups（status 置为 ASSIGNED）
      await queryClient.cancelQueries({ queryKey: taskListsKey });
      const previous = queryClient.getQueryData<TaskLists>(taskListsKey);
      if (previous) {
        const task = previous.available.find((t) => t.id === id);
        if (task) {
          queryClient.setQueryData<TaskLists>(taskListsKey, {
            available: previous.available.filter((t) => t.id !== id),
            pickups: [...previous.pickups, { ...task, status: 'ASSIGNED' as TaskStatus }],
            deliveries: previous.deliveries,
          });
        }
      }
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(taskListsKey, ctx.previous);
      }
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: taskListsKey });
      // S1: 同步刷 detail（详情页 accept 后返回会短暂显示旧 PENDING_ASSIGN）
      void queryClient.invalidateQueries({ queryKey: taskDetailKey(variables) });
    },
  });
}

/**
 * P14 ④ B1：return 任务开始配送（PICKED_UP → DELIVERING）
 * 仅 return 任务调（delivery 跳过 DELIVERING）。后端事务内同步写 refund.pickedAt。
 * 乐观更新 lists + detail，失败 rollback（不跨 list 移动，onSettled invalidate 纠正）。
 */
export function useStartDelivering() {
  const queryClient = useQueryClient();
  const { isOffline } = useNetwork();

  return useMutation({
    mutationFn: async (id: string) => {
      // CLAUDE.md 规则 12：离线入队（return 任务 PICKED_UP→DELIVERING），恢复后重放真 API。
      // 审查 S1：离线直接 enqueue + return（对齐 pickup），不读 detail、不 throw。
      if (isOffline) {
        await enqueue({ type: 'startDelivering', payload: { taskId: id } });
        return;
      }
      return taskApi.startDelivering(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: taskListsKey });
      const previousLists = queryClient.getQueryData<TaskLists>(taskListsKey);
      if (previousLists) {
        const updateList = (list: DeliveryTask[]) =>
          list.map((t) => (t.id === id ? { ...t, status: 'DELIVERING' as TaskStatus } : t));
        queryClient.setQueryData<TaskLists>(taskListsKey, {
          available: updateList(previousLists.available),
          pickups: updateList(previousLists.pickups),
          deliveries: updateList(previousLists.deliveries),
        });
      }
      const detailKey = taskDetailKey(id);
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previousDetail = queryClient.getQueryData<DeliveryTask | null>(detailKey);
      queryClient.setQueryData<DeliveryTask | null>(detailKey, (old) =>
        old ? { ...old, status: 'DELIVERING' as TaskStatus } : old,
      );
      return { previousLists, previousDetail, detailKey };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previousLists) queryClient.setQueryData(taskListsKey, ctx.previousLists);
      if (ctx?.previousDetail !== undefined && ctx?.detailKey) {
        queryClient.setQueryData(ctx.detailKey, ctx.previousDetail);
      }
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: taskListsKey });
      void queryClient.invalidateQueries({ queryKey: taskDetailKey(variables) });
    },
  });
}

