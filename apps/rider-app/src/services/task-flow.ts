import type { TranslationKey } from '@/src/i18n/useTranslation';
import type { DeliveryTask } from '@/src/types/task';

export type TaskActionTarget = 'pickup' | 'navigate' | 'sign';

export type TaskAction = {
  labelKey: TranslationKey;
  target: TaskActionTarget;
};

/**
 * status -> 按钮文案 + 跳转目标
 *
 * S4: 合并 tasks.tsx 列表页 + task/[id].tsx 详情页两处状态机，避免未来加状态改两处漏一处。
 * P14 ④ B1: PICKED_UP 统一跳 navigate（delivery 两步、return 三步都在 navigate 页分流）。
 *   return 任务在 navigate 页点"开始配送"先 startDelivering 进 DELIVERING，再跳 sign 调 deliver。
 *   DELIVERING 仅 return 任务会进（delivery 跳过），target=sign。
 * Why: 原代码 tasks.tsx 无差别跳 pickup，PICKED_UP 订单重复取货必然 409。
 */
export function getTaskAction(task: DeliveryTask): TaskAction | undefined {
  switch (task.status) {
    case 'PENDING_ASSIGN':
      // 详情页 handleAction 会先 accept 再跳 pickup
      return { labelKey: 'tasks.accept', target: 'pickup' };
    case 'ASSIGNED':
      return { labelKey: 'tasks.arrivedPickup', target: 'pickup' };
    case 'PICKED_UP':
      // delivery + return 都先跳 navigate（navigate 页底部按钮按 taskType 分流是否先 startDelivering）
      return { labelKey: 'tasks.startDelivery', target: 'navigate' };
    case 'DELIVERING':
      // 仅 return 任务进 DELIVERING（delivery 跳过），直接去签收
      return { labelKey: 'tasks.arrivedDelivery', target: 'sign' };
    default:
      // DELIVERED / FAILED 终态无 action（详情页 fallback 到 tasks.refresh）
      return undefined;
  }
}
