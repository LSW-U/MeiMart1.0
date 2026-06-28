import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';

import { connectRiderSocket } from '@/src/services/ws';
import { useAuthStore } from '@/src/store/useAuthStore';
import { taskListsKey } from '@/src/services/queries/useTask';
import { useQueryClient } from '@tanstack/react-query';

export type RiderSocketState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * 骑手 WS 连接生命周期管理：
 *   - 用 access token 握手（后端接受 'Bearer xxx' 或 'xxx'）
 *   - 自动加入 'riders' room（后端 handleConnection 按 role 自动加）
 *   - 监听 dispatch:new-task / task-accepted / task-removed → invalidate 抢单大厅
 *   - token 变化时自动重连
 *
 * 调用方：在骑手工作台根 layout 或 (main)/_layout.tsx 调一次。
 */
export function useRiderSocket() {
  // useAuthStore 暂未存 access token；从 tokenStorage 异步拿（与 hydrate 一致）
  // 这里读 isAuthenticated 触发重连
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [state, setState] = useState<RiderSocketState>('disconnected');
  const [socket, setSocket] = useState<Socket | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) {
      /* eslint-disable react-hooks/set-state-in-effect -- 原因：isAuthenticated 变化时同步清理 socket 状态，避免泄漏旧连接 */
      setState('disconnected');
      setSocket(null);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    let cancelled = false;

    (async () => {
      const { tokenStorage } = await import('@/src/services/token-storage');
      const token = await tokenStorage.get();
      if (cancelled || !token) {
        setState('disconnected');
        return;
      }

      setState('connecting');
      const sock = connectRiderSocket(token);
      if (cancelled) {
        sock.removeAllListeners();
        sock.disconnect();
        return;
      }
      setSocket(sock);

      sock.on('connect', () => setState('connected'));
      sock.on('disconnect', () => setState('disconnected'));
      sock.on('connect_error', () => setState('error'));

      // 其他骑手抢走任务 / 系统派单 → 失效抢单大厅缓存
      const invalidateTasks = (data: { taskId?: string }) => {
        console.log('[ws] task event', data);
        void queryClient.invalidateQueries({ queryKey: taskListsKey });
      };
      sock.on('dispatch:task-accepted', invalidateTasks);
      sock.on('dispatch:task-removed', invalidateTasks);
      sock.on('dispatch:new-task', invalidateTasks);
      sock.on('order:status-changed', (data: { orderId?: string }) => {
        console.log('[ws] order status changed', data);
        void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      });
    })();

    return () => {
      cancelled = true;
      setSocket((prev) => {
        if (prev) {
          prev.removeAllListeners();
          prev.disconnect();
        }
        return null;
      });
    };
  }, [isAuthenticated, queryClient]);

  return { socket, state };
}
