import type { DeliveryTask } from '@/src/types/task';

import { addNotification } from './notification';
import { addOrderHistory } from './order';
import { taskApi } from './task';

export type DeliveryEvidence = {
  photoUri?: string;
  doorUri?: string;
  packageUri?: string;
};

const computeFare = (fee: number): number => {
  const rounded = Math.round(fee * 100) / 100;
  return rounded > 0 ? rounded : 0;
};

// mock 模式的本地副作用：订单历史 + 通知（real 模式由后端生成）
async function writeMockSideEffects(task: DeliveryTask): Promise<void> {
  await addOrderHistory({
    id: task.id,
    orderNo: `#${task.id}`,
    status: 'completed',
    completedAt: Date.now(),
    pickupName: task.pickup.title,
    pickupAddress: task.pickup.address,
    dropoffName: task.dropoff.title,
    dropoffAddress: task.dropoff.address,
    income: computeFare(task.fee),
    distanceKm: task.distanceKm,
    durationMinutes: task.estimatedMinutes,
  });

  await addNotification({
    category: 'order',
    titleKey: 'notification.template.orderSigned.title',
    messageKey: 'notification.template.orderSigned.message',
    vars: { orderId: task.orderId },
    link: `/order/${task.id}`,
  });
}

// ── deliveryApi 对象 ────────────────────────────────────────────────

export const deliveryApi = {
  async confirmPickup(taskId: string, _evidence?: DeliveryEvidence): Promise<void> {
    // TODO(B.4.3+): real 模式下若 evidence.photoUri 存在，先调 uploadFile 上传拿 URL，
    // 再传给后端 /tasks/{id}/status（multipart 端点契约待后端确认）。当前 mock + real 都不传 photo。
    await taskApi.updateStatus(taskId, 'delivering');
  },

  async confirmDelivery(taskId: string, _evidence?: DeliveryEvidence): Promise<DeliveryTask> {
    // TODO(B.4.3+): 同上，evidence.doorUri + packageUri 待上传链路接入
    const task = await taskApi.updateStatus(taskId, 'completed');
    await writeMockSideEffects(task);
    return task;
  },

  async reportDeliveryProgress(taskId: string): Promise<DeliveryTask> {
    const task = await taskApi.getById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    return task;
  },
};
