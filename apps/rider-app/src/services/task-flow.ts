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
 * P14 ④ B1: PICKED_UP 统一跳 navigate。
 * 20261116 拍板（三步流统一）：所有任务类型统一 PICKED_UP->DELIVERING->DELIVERED，
 *   navigate 页「开始配送」对所有任务先 startDelivering 进 DELIVERING 再跳 sign；
 *   DELIVERING（普通单现在也会进）target=sign。
 * tab 分组同步改：pickups 只收 ASSIGNED；deliveries 收 PICKED_UP + DELIVERING。
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
      // 20261117 F2 拍板：return 任务取货后语义是「返仓」非「配送」，独立文案
      // （navigate 页 actionLabel 判断同步，两处同源靠本 helper——navigate.tsx 也走 getTaskAction? 否，
      // navigate.tsx:120 自判 taskType，修复批同步改；此处 labelKey 供列表卡）
      if (task.taskType === 'return') {
        return { labelKey: 'tasks.startReturn', target: 'navigate' };
      }
      // 所有任务类型都先跳 navigate（navigate 页「开始配送」先 startDelivering 再进 sign）
      return { labelKey: 'tasks.startDelivery', target: 'navigate' };
    case 'DELIVERING':
      // 20261116 三步流统一后普通单也会进 DELIVERING，直接去签收
      return { labelKey: 'tasks.arrivedDelivery', target: 'sign' };
    default:
      // DELIVERED / FAILED 终态无 action（详情页 fallback 到 tasks.refresh）
      return undefined;
  }
}
