import { addNotification } from './notification';
import { getTaskById, updateTaskStatus } from './task';

export async function confirmPickup(taskId: string) {
  await updateTaskStatus(taskId, 'delivering');
}

export async function confirmDelivery(taskId: string) {
  const task = await updateTaskStatus(taskId, 'completed');
  await addNotification({
    category: 'order',
    titleKey: 'notification.template.orderSigned.title',
    messageKey: 'notification.template.orderSigned.message',
    vars: { orderId: task.orderId },
  });
}

export async function reportDeliveryProgress(taskId: string) {
  const task = await getTaskById(taskId);

  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }
}
