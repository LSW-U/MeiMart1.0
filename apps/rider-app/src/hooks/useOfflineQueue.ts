import { useEffect, useState } from 'react';

import { database } from '../database';
import type { OfflineQueueEntry } from '../database/models';
import { getDeadCount, processQueue, purgeFailedEntries, type QueueAction } from '../database/sync';

/**
 * 离线队列 React 绑定（CLAUDE.md 规则 12）。
 *
 * - pendingCount：subscribe WMB observeCount，UI 实时显示待同步条数（OfflineBanner 可读）。
 * - deadCount：R-P1-3 死信数（attempts >= MAX 的活条目），随队列变化重算——permanent
 *   立即死信与 5 轮耗尽死信都会反映到这里，Banner 暴露给骑手。
 * - flush：转发 sync.processQueue（online 恢复时 (main)/_layout 触发；Banner 手动重试也走这）。
 * - abandonFailed：R-P1-3「放弃」——purge 死信（软删），骑手可清掉卡死的失败项。
 *
 * 审查 M1：enqueue 由消费方直接 import sync.enqueue（不通过 hook），hook 仅暴露
 * flush + pendingCount + deadCount + abandonFailed。
 *
 * 用 database 单例 + useEffect 订阅，不需要 <DatabaseProvider>。
 */
export function useOfflineQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [deadCount, setDeadCount] = useState(0);

  useEffect(() => {
    const sub = database
      .get<OfflineQueueEntry>('offline_queue')
      .query()
      .observeCount()
      .subscribe((count) => {
        setPendingCount(count);
        // 死信数随队列变化重算（死信也是活条目，observeCount 已覆盖其增减）
        void getDeadCount()
          .then(setDeadCount)
          .catch(() => setDeadCount(0));
      });
    return () => sub.unsubscribe();
  }, []);

  return {
    pendingCount,
    deadCount,
    flush: processQueue,
    abandonFailed: purgeFailedEntries,
  };
}

export type { QueueAction };
