import { database } from './index';
import type { OfflineQueueEntry } from './models';
import { taskApi } from '../services/task';
import { deleteEvidenceFile, forgetUploadedUrl, uploadEvidenceCached } from '../services/evidence';
import { ApiError, refreshAccessToken } from '../services/api';

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
  | {
      type: 'pickup';
      payload: { taskId: string; note?: string; evidence?: Record<string, string> };
    }
  | { type: 'startDelivering'; payload: { taskId: string; note?: string } }
  | {
      type: 'deliver';
      payload: {
        taskId: string;
        collectedAmount?: number;
        note?: string;
        evidence?: Record<string, string>;
      };
    };

const MAX_ATTEMPTS = 5;

export async function enqueue(action: QueueAction): Promise<void> {
  await database.write(async () => {
    // 审查 M2：同 taskId+action 已有未超限 entry 则去重，避免重复入队。
    // 批1 R-P1-5：taskId 拆独立列后走索引查询（不再 JSON.parse payload 全表扫）；
    // WMB query().fetch() 默认排除软删（已 markAsDeleted），existing 都是未处理项；
    // 只去重 attempts < MAX（超限死信允许新建，给重试机会）。UI button disabled 已防重复点击，此为双保险。
    const existing = await database.get<OfflineQueueEntry>('offline_queue').query().fetch();
    const taskId = action.payload.taskId;
    const dup = existing.find(
      (e) => e.action === action.type && e.attempts < MAX_ATTEMPTS && e.taskId === taskId,
    );
    if (dup) return;

    await database.get<OfflineQueueEntry>('offline_queue').create((entry) => {
      entry.action = action.type;
      entry.taskId = taskId;
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
// 审查 S2：模块级并发锁，防 isOffline 抖动触发多个 processQueue 并发跑（重复 dispatch + attempts 浪费）。
let processing = false;
export async function processQueue(): Promise<{ synced: number; failed: number }> {
  if (processing) return { synced: 0, failed: 0 };
  processing = true;
  try {
    const allEntries = await database.get<OfflineQueueEntry>('offline_queue').query().fetch();
    // FIFO：WMB query 不保证顺序，显式按 createdAt 升序（C2：契约统一为 @date Date，
    // 删 number|Date 兼容段——tasks/orders 死表已随 C1 删除，唯一 @date 消费方即此处）
    const entries = [...allEntries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    // 审查 M4：快照语义——开头 fetch 快照后，for 循环处理期间新 enqueue 的 entry 不在本轮，
    // 需等下次 flush。保证 FIFO + 避免处理中入队立即处理的无限循环。

    let synced = 0;
    let failed = 0;
    // 审查 S6：同 taskId 前序失败则后序本轮跳过（避免 pickup 失败时 deliver 无效请求触发后端状态机报错）
    const failedTaskIds = new Set<string>();

    for (const entry of entries) {
      if (entry.attempts >= MAX_ATTEMPTS) {
        failed++;
        continue;
      }

      // R-P2-13：历史脏行（损坏 payload）跳过不炸整轮——记 attempts+1 + lastError 落盘，
      // 留给 purgeFailedEntries 清理；坏行不得阻断后续 FIFO 条目
      let payload: unknown;
      try {
        payload = JSON.parse(entry.payload);
      } catch (parseError) {
        await database.write(async () => {
          await entry.update((record) => {
            record.attempts += 1;
            record.lastError =
              parseError instanceof Error ? parseError.message : String(parseError);
          });
        });
        failed++;
        continue;
      }
      const taskId = (payload as { taskId?: string }).taskId;
      // S6：前序同 taskId 失败 -> 后序本轮跳过（不 dispatch；下轮 failedTaskIds 重置，前序重试成功则后序再试）
      if (taskId && failedTaskIds.has(taskId)) continue;

      try {
        const action = { type: entry.action, payload } as QueueAction;
        // 批3-裁决1（A）：dispatchAction 返回上报用的远端 evidenceUrls（无 evidence 时空对象），
        // 成功后在同一 write 闭包内写回 entry payload 落盘——后端补 evidence 字段前 URL
        // 不再随进程丢失（历史单可查）；写回与软删同段，writer 纪律一处满足
        const evidenceUrls = await dispatchAction(action);
        // R-P0-2（D15）：写段（URL 写回 + 软删 + 失败计数）必须包进 database.write——WMB 0.28
        // writer 断言要求写操作在 write 闭包内，否则原队列「入得队、永远消费不了」。
        // dispatchAction（网络调用）留 write 外，避免长网络请求占住 writer。
        await database.write(async () => {
          if (Object.keys(evidenceUrls).length > 0) {
            await entry.update((record) => {
              record.payload = JSON.stringify({
                ...(payload as Record<string, unknown>),
                evidenceUrls,
              });
            });
          }
          await entry.markAsDeleted();
        });
        synced++;
      } catch (e) {
        if (taskId) failedTaskIds.add(taskId);
        // R-P1-3 错误分型：permanent（4xx 业务拒绝）立即死信（attempts 拉满，不再重试），
        //   不浪费 5 轮网络请求；retryable（网络/5xx）维持 attempts+1 逐轮退避。
        const permanent = e instanceof PermanentSyncError;
        const errorMessage = e instanceof Error ? e.message : String(e);
        // 修 bug：直接 entry.attempts += 1 不持久化（WMB 要 update），改用 entry.update；
        // R-P0-2：update 同属写操作，包进 database.write
        await database.write(async () => {
          await entry.update((record) => {
            record.attempts = permanent ? MAX_ATTEMPTS : record.attempts + 1;
            record.lastError = permanent ? `permanent: ${errorMessage}` : errorMessage;
          });
        });
        failed++;
      }
    }

    return { synced, failed };
  } finally {
    processing = false;
  }
}

/**
 * 按 action type 路由到 taskApi 真实方法（复用端点路径 + fromView + mock 层）。
 * 静态 import taskApi：task.ts 不引 sync.ts，无循环依赖；动态 import 在 jest 不支持（需 --experimental-vm-modules）。
 */
/** 永久失败错误（业务性拒绝，重试无意义——立即死信，R-P1-3 分型） */
export class PermanentSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermanentSyncError';
  }
}

/**
 * C17（批2 遗留拍板②）：401 不再立即 permanent——先走一次 token 刷新重试，
 * 仍失败才 permanent。Why：queue 里积压的条目跨时间跨度大，token 可能在入队后
 * 过期；axios 拦截器只对当次请求做 _retry，queue dispatch 拿到的 401 已是「刷新后
 * 仍失败」或「拦截器未覆盖」的边缘态，再给一次显式刷新机会，避免活跃用户被误死信。
 * 其余 4xx（403/404/409/422）维持立即死信——重试不可能改变结果。
 */
function isPermanentStatus(status: number | undefined): boolean {
  if (status == null) return false;
  if (status === 401) return false;
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

/** 401 专用（C17 + D13 批4 收紧）：显式刷新 token 后重试一次 fn——
 * 刷新成功：fn 用拦截器新 token 重发；重试仍 401 → PermanentSyncError
 * （新 token 下仍 401 = 凭证已失效/会话被顶，重试无意义，交死信 + 登出回调接管）；
 * 刷新失败（无 refreshToken/refresh 401）：直接跑 fn 原样抛错，交上层
 * isPermanentStatus 分型（401 不判 permanent，走 attempts 重试直至登出回调接管）。 */
async function retryAfterTokenRefresh<T>(fn: () => Promise<T>): Promise<T> {
  await refreshAccessToken();
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      throw new PermanentSyncError(`[401] token refreshed but still unauthorized: ${e.message}`);
    }
    throw e;
  }
}

/** 返回该 action 上报时用到的远端 evidenceUrls（批3-裁决1：供 processQueue 写回 payload 落盘） */
export async function dispatchAction(action: QueueAction): Promise<Record<string, string>> {
  switch (action.type) {
    case 'pickup': {
      // R-P1-2（A 方案）：队列若带本地证据路径，先上传拿远端 URL 再报状态（证据与状态原子对应）。
      // P2-2：uploadEvidenceCached 进程内缓存——重试轮次同文件不重传（防服务端重复副本）。
      const evidenceUrls = action.payload.evidence
        ? await uploadEvidenceCached(action.payload.evidence)
        : {};
      try {
        await taskApi.pickup(action.payload.taskId, action.payload.note);
      } catch (e) {
        // C17：401 先刷新 token 重试一次，仍失败再走分型（401 不判 permanent）
        if (e instanceof ApiError && e.status === 401) {
          await retryAfterTokenRefresh(() =>
            taskApi.pickup(action.payload.taskId, action.payload.note),
          );
        } else if (e instanceof ApiError && isPermanentStatus(e.status)) {
          throw new PermanentSyncError(`[${e.status}] ${e.message}`);
        } else {
          throw e;
        }
      }
      // 上报成功后清本地证据文件（上传已拿到 URL，本地副本使命完成）+ 回收 URL 缓存
      for (const uri of Object.values(action.payload.evidence ?? {})) {
        if (uri) {
          deleteEvidenceFile(uri);
          forgetUploadedUrl(uri);
        }
      }
      // C16（P2-1 修复，裁决①）：URL 挂起丢弃改 console.info 显式落日志——
      // 后端补 evidence 字段前 URL 无请求落点；批3-裁决1（A）：改为写回队列 entry
      // payload 落盘（processQueue 成功段），进程重启后历史单仍可读回 URL。
      // 后端补字段时：删 processQueue 写回段 + task.ts pickup/deliver body 并入 evidenceUrls（+ 后端 DTO 同步）。
      console.info('[offline-queue] evidence urls pending backend field:', evidenceUrls);
      return evidenceUrls;
    }
    case 'startDelivering':
      try {
        await taskApi.startDelivering(action.payload.taskId, action.payload.note);
      } catch (e) {
        // C17：同 pickup——401 先刷新重试
        if (e instanceof ApiError && e.status === 401) {
          await retryAfterTokenRefresh(() =>
            taskApi.startDelivering(action.payload.taskId, action.payload.note),
          );
        } else if (e instanceof ApiError && isPermanentStatus(e.status)) {
          throw new PermanentSyncError(`[${e.status}] ${e.message}`);
        } else {
          throw e;
        }
      }
      return {};
    case 'deliver': {
      // P2-2：同 pickup——缓存上传 + 成功后回收文件与 URL 缓存
      const evidenceUrls = action.payload.evidence
        ? await uploadEvidenceCached(action.payload.evidence)
        : {};
      try {
        await taskApi.deliver(action.payload.taskId, {
          collectedAmount: action.payload.collectedAmount,
          note: action.payload.note,
        });
      } catch (e) {
        // C17：同 pickup——401 先刷新重试
        if (e instanceof ApiError && e.status === 401) {
          await retryAfterTokenRefresh(() =>
            taskApi.deliver(action.payload.taskId, {
              collectedAmount: action.payload.collectedAmount,
              note: action.payload.note,
            }),
          );
        } else if (e instanceof ApiError && isPermanentStatus(e.status)) {
          throw new PermanentSyncError(`[${e.status}] ${e.message}`);
        } else {
          throw e;
        }
      }
      for (const uri of Object.values(action.payload.evidence ?? {})) {
        if (uri) {
          deleteEvidenceFile(uri);
          forgetUploadedUrl(uri);
        }
      }
      // C16：同 pickup——URL 挂起落日志（后端补字段时并入 deliver body）；写回由 processQueue 统一落盘
      console.info('[offline-queue] evidence urls pending backend field:', evidenceUrls);
      return evidenceUrls;
    }
    default: {
      const _exhaustive: never = action;
      console.warn('[offline-queue] Unknown action type:', _exhaustive);
      return {};
    }
  }
}

export async function getQueueSize(): Promise<number> {
  return database.get<OfflineQueueEntry>('offline_queue').query().fetchCount();
}

/**
 * R-P1-3：死信统计（Banner「N 条同步失败」用）。
 * 死信 = attempts >= MAX_ATTEMPTS 的活条目（permanent 立即死信也落此态）。
 * 注意：WMB query 默认排除软删，死信未软删（留给 purgeFailedEntries 清理），
 * fetchCount 即活死信数。
 */
export async function getDeadCount(): Promise<number> {
  const entries = await database.get<OfflineQueueEntry>('offline_queue').query().fetch();
  return entries.filter((e) => e.attempts >= MAX_ATTEMPTS).length;
}

/**
 * R-P1-3「放弃」：清死信 + 逐条回收其证据文件。
 * P2-6 修复：不再整目录 clearEvidenceDir——队列可同时存在死信与带 evidence 的活条目
 * （pickup 死信 + deliver 活条目是常见 FIFO 组合），整目录清会把活条目的本地文件一并
 * 删掉，其后续重试上传必失败直至死信（证据永久丢失）。改逐条目 JSON.parse payload 取
 * 路径删文件；parse 失败的坏条目跳过（文件残留仅占磁盘，无害）。
 * 返回 purged 条数（Banner toast 用）。
 */
export async function purgeFailedEntries(): Promise<number> {
  const entries = await database.get<OfflineQueueEntry>('offline_queue').query().fetch();

  let purged = 0;
  await database.write(async () => {
    for (const entry of entries) {
      if (entry.attempts >= MAX_ATTEMPTS) {
        // P2-6：死信自己的证据文件逐个回收（parse 失败跳过，不误伤活条目）
        try {
          const payload = JSON.parse(entry.payload) as { evidence?: Record<string, string> };
          for (const uri of Object.values(payload.evidence ?? {})) {
            if (uri) {
              deleteEvidenceFile(uri);
              forgetUploadedUrl(uri);
            }
          }
        } catch {
          // payload 损坏：文件无法定位，跳过（孤儿文件无害）
        }
        // R-P0-2 同源：markAsDeleted 也是写操作，此处已在 write 闭包内（原实现正确，保留）
        await entry.markAsDeleted();
        purged++;
      }
    }
  });
  return purged;
}
