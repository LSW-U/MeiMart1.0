import { useEffect } from 'react';

import { riderApi } from '@/src/services/user';

/**
 * 骑手在线时调 /rider/heartbeat 续期。
 * 后端用 Redis `rider:online:{riderId}` SETEX 60s 维护在线状态，
 * 必须在 60s 内续期，否则会被判离线 → 影响派单。
 *
 * S5: 用递归 setTimeout 替代 setInterval —— 成功 50s 再发，失败 5s 快重试。
 * 东帝汶弱网是常态，一次抖动失败若等满 50s 会越过 Redis 60s TTL 误判离线，
 * 反向风险（误离线丢派单收入）远大于重试开销。
 */
export function useHeartbeat(isOnline: boolean): void {
  useEffect(() => {
    if (!isOnline) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const tick = () => {
      riderApi
        .heartbeat()
        .then(() => {
          if (!cancelled) timer = setTimeout(tick, 50_000);
        })
        .catch((e) => {
          console.warn('[heartbeat] failed, retry in 5s:', e);
          if (!cancelled) timer = setTimeout(tick, 5_000);
        });
    };

    // 首次 50s 后发（与原 setInterval 行为一致）
    timer = setTimeout(tick, 50_000);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isOnline]);
}
