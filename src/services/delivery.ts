import { getTaskById, updateTaskStatus } from './task';

export async function confirmPickup(taskId: string) {
  await updateTaskStatus(taskId, 'delivering');
}

export async function confirmDelivery(taskId: string) {
  await updateTaskStatus(taskId, 'completed');
}

export async function reportDeliveryProgress(taskId: string) {
  const task = await getTaskById(taskId);

  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }
}
