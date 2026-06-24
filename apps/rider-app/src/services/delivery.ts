import { addNotification } from './notification';
import { addOrderHistory } from './order';
import { taskApi } from './task';

const computeFare = (fee: number): number => {
  const rounded = Math.round(fee * 100) / 100;
  return rounded > 0 ? rounded : 0;
};

export async function confirmPickup(taskId: string) {
  await taskApi.updateStatus(taskId, 'delivering');
}

export async function confirmDelivery(taskId: string) {
  const task = await taskApi.updateStatus(taskId, 'completed');

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

export async function reportDeliveryProgress(taskId: string) {
  const task = await taskApi.getById(taskId);

  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }
}