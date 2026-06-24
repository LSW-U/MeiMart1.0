import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deliveryApi, type DeliveryEvidence } from '../delivery';
import { taskDetailKey, taskListsKey } from './useTask';

// 豁免说明：本文件 2 个 mutation（confirmPickup / confirmDelivery）触发的是
// taskApi.updateStatus 的间接调用，乐观更新由 useUpdateTaskStatus 处理；
// 这里仅做 onSettled invalidate 让 useTaskLists/useTask 自动 refetch。
// CLAUDE.md rider 弱网规则 #12「配送状态上报必须支持乐观更新」的覆盖在 useUpdateTaskStatus。
export function useConfirmPickup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { taskId: string; evidence?: DeliveryEvidence }) =>
      deliveryApi.confirmPickup(params.taskId, params.evidence),
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: taskListsKey });
      void queryClient.invalidateQueries({ queryKey: taskDetailKey(variables.taskId) });
    },
  });
}

export function useConfirmDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { taskId: string; evidence?: DeliveryEvidence }) =>
      deliveryApi.confirmDelivery(params.taskId, params.evidence),
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: taskListsKey });
      void queryClient.invalidateQueries({ queryKey: taskDetailKey(variables.taskId) });
    },
  });
}
