import { useEffect } from 'react';

import { riderApi } from '@/src/services/user';

/**
 * 骑手在线时每 50s 调一次 /rider/heartbeat 续期。
 * 后端用 Redis `rider:online:{riderId}` SETEX 60s 维护在线状态，
 * 必须在 60s 内续期，否则会被判离线 → 影响派单。
 *
 * 失败不重试，下一次 interval 自然重试（避免短网络抖动放大）。
 */
export function useHeartbeat(isOnline: boolean): void {
  useEffect(() => {
    if (!isOnline) return;
    const id = setInterval(() => {
      void riderApi.heartbeat().catch((e) => {
        console.warn('[heartbeat] failed:', e);
      });
    }, 50_000);
    return () => clearInterval(id);
  }, [isOnline]);
}
