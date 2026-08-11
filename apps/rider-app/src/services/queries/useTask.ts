import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { DeliveryTask, ReportIssueReason, TaskStatus } from '@/src/types/task';

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
      // S1: 同步刷 detail（详情页 accept 后返回会短暂显示旧 PENDING_ASSIGN），与 useUpdateTaskStatus 对称
      void queryClient.invalidateQueries({ queryKey: taskDetailKey(variables) });
    },
  });
}

/**
 * P14 ④ B1：return 任务开始配送（PICKED_UP → DELIVERING）
 * 仅 return 任务调（delivery 跳过 DELIVERING）。后端事务内同步写 refund.pickedAt。
 * 乐观更新 lists + detail，失败 rollback，参考 useUpdateTaskStatus 模式（不跨 list 移动，onSettled invalidate 纠正）。
 */
export function useStartDelivering() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskApi.startDelivering(id),
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

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      status: TaskStatus;
      collectedAmount?: number;
      note?: string;
      reason?: ReportIssueReason;
    }): Promise<DeliveryTask> => {
      // 后端按状态拆 3 个端点：PICKED_UP → pickup, DELIVERED → deliver, FAILED → report-issue
      // 其他状态（ASSIGNED/DELIVERING）由 accept/deliver 自动流转，前端不需要主动调用
      if (params.status === 'PICKED_UP') {
        return taskApi.pickup(params.id, params.note);
      }
      if (params.status === 'DELIVERED') {
        return taskApi.deliver(params.id, {
          collectedAmount: params.collectedAmount,
          note: params.note,
        });
      }
      if (params.status === 'FAILED') {
        return taskApi.reportIssue(params.id, {
          reason: params.reason ?? 'OTHER',
          note: params.note,
        });
      }
      // ASSIGNED / DELIVERING 等中间态：后端不接受主动切换，直接读当前任务
      const current = await taskApi.getById(params.id);
      if (!current) throw new Error(`Task not found: ${params.id}`);
      return current;
    },
    onMutate: async ({ id, status }) => {
      // 乐观更新 lists：在三个 list 中找到 task 并更新 status（不跨 list 移动，onSettled invalidate 自动纠正）
      await queryClient.cancelQueries({ queryKey: taskListsKey });
      const previousLists = queryClient.getQueryData<TaskLists>(taskListsKey);
      if (previousLists) {
        const updateList = (list: DeliveryTask[]) =>
          list.map((t) => (t.id === id ? { ...t, status } : t));
        queryClient.setQueryData<TaskLists>(taskListsKey, {
          available: updateList(previousLists.available),
          pickups: updateList(previousLists.pickups),
          deliveries: updateList(previousLists.deliveries),
        });
      }
      // 同时乐观更新 detail query
      const detailKey = taskDetailKey(id);
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previousDetail = queryClient.getQueryData<DeliveryTask | null>(detailKey);
      queryClient.setQueryData<DeliveryTask | null>(detailKey, (old) =>
        old ? { ...old, status } : old,
      );
      return { previousLists, previousDetail, detailKey };
    },
    onError: (_err, _params, ctx) => {
      if (ctx?.previousLists) queryClient.setQueryData(taskListsKey, ctx.previousLists);
      if (ctx?.previousDetail !== undefined && ctx?.detailKey) {
        queryClient.setQueryData(ctx.detailKey, ctx.previousDetail);
      }
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: taskListsKey });
      void queryClient.invalidateQueries({ queryKey: taskDetailKey(variables.id) });
    },
  });
}
