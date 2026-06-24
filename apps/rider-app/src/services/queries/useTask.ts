import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { DeliveryTask, TaskStatus } from '@/src/types/task';

import { taskApi } from '../task';

type TaskLists = {
  available: DeliveryTask[];
  pickups: DeliveryTask[];
  deliveries: DeliveryTask[];
};

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
  return useQuery({
    queryKey: id ? taskDetailKey(id) : ['tasks', 'detail', 'none'],
    queryFn: () => taskApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useAcceptTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskApi.accept(id),
    onMutate: async (id) => {
      // 乐观更新：从 available 移到 pickups（status 置为 accepted）
      await queryClient.cancelQueries({ queryKey: taskListsKey });
      const previous = queryClient.getQueryData<TaskLists>(taskListsKey);
      if (previous) {
        const task = previous.available.find((t) => t.id === id);
        if (task) {
          queryClient.setQueryData<TaskLists>(taskListsKey, {
            available: previous.available.filter((t) => t.id !== id),
            pickups: [...previous.pickups, { ...task, status: 'accepted' as TaskStatus }],
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
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskListsKey });
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; status: TaskStatus }) =>
      taskApi.updateStatus(params.id, params.status),
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
