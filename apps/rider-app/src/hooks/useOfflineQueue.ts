import { useEffect, useState } from 'react';

import { database } from '../database';
import type { OfflineQueueEntry } from '../database/models';
import { enqueue as dbEnqueue, processQueue, type QueueAction } from '../database/sync';

/**
 * 离线队列 React 绑定（CLAUDE.md 规则 12）。
 *
 * - pendingCount：subscribe WMB observeCount，UI 实时显示待同步条数（OfflineBanner 可读）。
 * - enqueue：转发 sync.enqueue（mutation hook 离线时调）。
 * - flush：转发 sync.processQueue（online 恢复时 (main)/_layout 触发）。
 *
 * 用 database 单例 + useEffect 订阅，不需要 <DatabaseProvider>。
 */
export function useOfflineQueue() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const sub = database
      .get<OfflineQueueEntry>('offline_queue')
      .query()
      .observeCount()
      .subscribe(setPendingCount);
    return () => sub.unsubscribe();
  }, []);

  return {
    pendingCount,
    enqueue: dbEnqueue,
    flush: processQueue,
  };
}

export type { QueueAction };
