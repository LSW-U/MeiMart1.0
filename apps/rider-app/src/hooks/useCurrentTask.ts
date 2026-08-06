import { useTaskLists } from '@/src/services/queries/useTask';
import type { DeliveryTask } from '@/src/types/task';

/**
 * 当前配送中的任务（用于 location:update 推送的 orderId 来源）。
 *
 * 策略：deliveries[0] ?? pickups[0] ?? null
 * - deliveries（DELIVERING）优先：送货途中，最需要实时位置
 * - pickups（ASSIGNED/PICKED_UP）次之：取货途中
 * - 多任务并发时只上报第一个（后端 location:update 单 orderId；多订单循环上报留作未来）
 *
 * 订单 DELIVERED/FAILED 后会从 deliveries/pickups 移出，currentOrderId 自动变 undefined，
 * useLocation 的 emit 守卫会停止推送。
 */
export function useCurrentTask() {
  const { data: taskLists } = useTaskLists();
  const currentTask: DeliveryTask | null = taskLists?.deliveries[0] ?? taskLists?.pickups[0] ?? null;
  return {
    currentTask,
    hasCurrentTask: Boolean(currentTask),
    currentOrderId: currentTask?.orderId ?? undefined,
  };
}
