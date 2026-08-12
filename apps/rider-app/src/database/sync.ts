import { database } from './index';
import type { OfflineQueueEntry } from './models';
import { taskApi } from '../services/task';

/**
 * 离线队列消费器（CLAUDE.md 规则 12）。
 *
 * 配送状态上报（pickup / startDelivering / deliver）离线时入队，恢复后 processQueue 串行重放。
 * accept 不入队（规则 14：抢单竞态，离线直接阻止，见 app/task/[id].tsx）。
 *
 * 失败策略：每次 processQueue 失败 attempts+1，超 MAX_ATTEMPTS 永久跳过（purgeFailedEntries 清理）。
 */

/** 离线队列 action 判别联合（enqueue 入参，dispatchAction 按 type 窄化） */
export type QueueAction =
  | { type: 'pickup'; payload: { taskId: string; note?: string } }
  | { type: 'startDelivering'; payload: { taskId: string; note?: string } }
  | { type: 'deliver'; payload: { taskId: string; collectedAmount?: number; note?: string } };

const MAX_ATTEMPTS = 5;

export async function enqueue(action: QueueAction): Promise<void> {
  await database.write(async () => {
    await database.get<OfflineQueueEntry>('offline_queue').create((entry) => {
      entry.action = action.type;
      entry.payload = JSON.stringify(action.payload);
      entry.attempts = 0;
    });
  });
}

/**
 * 串行消费队列。返回 synced/failed 计数。
 *
 * FIFO：按 createdAt 升序排（先入先出，保证 pickup -> deliver 顺序，避免乱序导致后端状态机报错）。
 * 成功：markAsDeleted（WMB 软删除）。
 * 失败：attempts += 1 + 记 lastError（必须 entry.update 才持久化，直接改属性不落盘 -- 修旧 bug）。
 */
export async function processQueue(): Promise<{ synced: number; failed: number }> {
  const allEntries = await database
    .get<OfflineQueueEntry>('offline_queue')
    .query()
    .fetch();
  // FIFO：WMB query 不保证顺序，显式按 createdAt 升序
  const entries = [...allEntries].sort((a, b) => {
    const ta = typeof a.createdAt === 'number' ? a.createdAt : a.createdAt.getTime();
    const tb = typeof b.createdAt === 'number' ? b.createdAt : b.createdAt.getTime();
    return ta - tb;
  });

  let synced = 0;
  let failed = 0;

  for (const entry of entries) {
    if (entry.attempts >= MAX_ATTEMPTS) {
      failed++;
      continue;
    }

    try {
      const action = {
        type: entry.action,
        payload: JSON.parse(entry.payload),
      } as QueueAction;
      await dispatchAction(action);
      await entry.markAsDeleted();
      synced++;
    } catch (e) {
      // 修 bug：直接 entry.attempts += 1 不持久化（WMB 要 update），改用 entry.update
      await entry.update((record) => {
        record.attempts += 1;
        record.lastError = e instanceof Error ? e.message : String(e);
      });
      failed++;
    }
  }

  return { synced, failed };
}

/**
 * 按 action type 路由到 taskApi 真实方法（复用端点路径 + fromView + mock 层）。
 * 静态 import taskApi：task.ts 不引 sync.ts，无循环依赖；动态 import 在 jest 不支持（需 --experimental-vm-modules）。
 */
export async function dispatchAction(action: QueueAction): Promise<void> {
  switch (action.type) {
    case 'pickup':
      await taskApi.pickup(action.payload.taskId, action.payload.note);
      return;
    case 'startDelivering':
      await taskApi.startDelivering(action.payload.taskId, action.payload.note);
      return;
    case 'deliver':
      await taskApi.deliver(action.payload.taskId, {
        collectedAmount: action.payload.collectedAmount,
        note: action.payload.note,
      });
      return;
    default: {
      const _exhaustive: never = action;
      console.warn('[offline-queue] Unknown action type:', _exhaustive);
    }
  }
}

export async function getQueueSize(): Promise<number> {
  return database
    .get<OfflineQueueEntry>('offline_queue')
    .query()
    .fetchCount();
}

/** 清理 attempts >= MAX_ATTEMPTS 的死信（永久失败项） */
export async function purgeFailedEntries(): Promise<number> {
  const entries = await database
    .get<OfflineQueueEntry>('offline_queue')
    .query()
    .fetch();

  let purged = 0;
  await database.write(async () => {
    for (const entry of entries) {
      if (entry.attempts >= MAX_ATTEMPTS) {
        await entry.markAsDeleted();
        purged++;
      }
    }
  });
  return purged;
}
