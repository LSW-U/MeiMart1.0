import type { DeliveryTask } from '@/src/types/task';

import { isMockMode } from './api';
import { deleteEvidenceFile, forgetUploadedUrl, uploadEvidenceCached } from './evidence';
import { notificationApi } from './notification';
import { orderApi } from './order';
import { taskApi } from './task';

export type DeliveryEvidence = {
  photoUri?: string;
  doorUri?: string;
  packageUri?: string;
};

const computeFare = (fee: number): number => {
  // P6 #7 配送费单位是分：换算到 dollar 再两位小数（对齐后端 contract 与 display 一致）。
  const dollars = fee / 100;
  const rounded = Math.round(dollars * 100) / 100;
  return rounded > 0 ? rounded : 0;
};

// mock 模式的本地副作用：订单历史 + 通知（real 模式由后端生成）
async function writeMockSideEffects(task: DeliveryTask): Promise<void> {
  if (!isMockMode) return;
  await orderApi.add({
    id: task.id,
    // mock 模式单号（20261115 批4）：任务卡/详情页同源——mock 任务无 orderNo 字段，
    // 用任务 id 保持原有 # 风格（real 模式历史走后端 /rider/orders/history 真单号，不经此处）
    orderNo: `#${task.orderNo ?? task.orderId}`,
    status: 'completed',
    completedAt: Date.now(),
    pickupName: task.pickup?.title ?? task.pickupAddress,
    pickupAddress: task.pickupAddress,
    dropoffName: task.dropoff?.title ?? task.dropoffAddress,
    dropoffAddress: task.dropoffAddress,
    income: computeFare(task.fee ?? 0),
    distanceKm: task.distanceKm ?? 0,
    durationMinutes: task.estimatedMinutes ?? 0,
  });

  await notificationApi.add({
    category: 'order',
    titleKey: 'notification.template.orderSigned.title',
    messageKey: 'notification.template.orderSigned.message',
    // 单号修复（20261115 批2）：orderId 是内部 UUID 外键，通知文案显示业务单号 orderNo
    // （历史单缺失降级回退，与大厅卡/详情页同规则）
    vars: { orderId: task.orderNo ?? task.orderId },
    link: `/order/${task.id}`,
  });
}

// ── deliveryApi 对象 ────────────────────────────────────────────────

export const deliveryApi = {
  async confirmPickup(taskId: string, evidence?: DeliveryEvidence): Promise<void> {
    // 在线取证接线（前端接线切换 T1-D4）：evidence 先 uploadEvidenceCached 拿远端 URL
    // 再随 pickup body.evidenceUrls 上报；成功后清本地副本 + 回收 URL 缓存（对齐 sync.ts 先例）。
    const evidenceUrls = evidence
      ? Object.values(await uploadEvidenceCached(evidence)).filter((u): u is string => Boolean(u))
      : [];
    await taskApi.pickup(taskId, {
      note: evidence?.doorUri ? 'door photo attached' : undefined,
      evidenceUrls,
    });
    for (const uri of Object.values(evidence ?? {})) {
      if (uri) {
        deleteEvidenceFile(uri);
        forgetUploadedUrl(uri);
      }
    }
  },

  async confirmDelivery(
    taskId: string,
    evidence?: DeliveryEvidence,
    collectedAmount?: number,
  ): Promise<DeliveryTask> {
    // 在线取证接线（T1-D4）：同 confirmPickup
    const evidenceUrls = evidence
      ? Object.values(await uploadEvidenceCached(evidence)).filter((u): u is string => Boolean(u))
      : [];
    const task = await taskApi.deliver(taskId, { collectedAmount, evidenceUrls });
    for (const uri of Object.values(evidence ?? {})) {
      if (uri) {
        deleteEvidenceFile(uri);
        forgetUploadedUrl(uri);
      }
    }
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
