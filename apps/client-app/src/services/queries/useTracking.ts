import { useEffect, useRef, useState } from 'react';
import { connectOrderTracking, type RiderLocation, type WsConnectionState } from '@/services/tracking';
import { orderApi } from '@/services/orders';
import { useAuthStore } from '@/store/authStore';
import type { OrderStatus } from '@/types';

// Why: WS 主通道，5s 无消息降级到 30s HTTP 轮询（CLAUDE.md §配送追踪双轨）
const WS_TIMEOUT_MS = 5000;
const POLL_INTERVAL_MS = 30_000;

export interface OrderTrackingState {
  wsState: WsConnectionState;
  riderLocation: RiderLocation | null;
  lastOrderStatus: OrderStatus | null;
}

/**
 * 订单配送追踪 hook：
 *   - 启动 WS 连接，监听 'order:location' / 'order:status-changed'
 *   - WS 5s 无消息时启动 HTTP 轮询（orders.getTracking）兜底
 *   - WS 恢复时停止轮询
 *   - unmount 时清理 socket + 定时器
 */
export function useOrderTracking(orderId: string | undefined): OrderTrackingState {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [state, setState] = useState<OrderTrackingState>({
    wsState: 'disconnected',
    riderLocation: null,
    lastOrderStatus: null,
  });

  // Why: 用 lazy ref 避免 useRef(Date.now()) 触发 react-hooks/purity 规则（render 期不允许 impure 调用）
  const socketRef = useRef<ReturnType<typeof connectOrderTracking> | null>(null);
  const lastMsgRef = useRef<number>(0);

  useEffect(() => {
    if (!orderId || !accessToken) return;

    // Why: 不在 effect body 直接 setState('connecting')（react-hooks/set-state-in-effect 规则），
    // socket 自身事件（connect / connect_error / disconnect）会驱动 wsState 更新
    const socket = connectOrderTracking(orderId, accessToken);
    socketRef.current = socket;
    lastMsgRef.current = Date.now();

    const handleConnect = () => {
      lastMsgRef.current = Date.now();
      setState((s) => ({ ...s, wsState: 'connected' }));
    };
    const handleDisconnect = () => {
      setState((s) => ({ ...s, wsState: 'disconnected' }));
    };
    const handleConnectError = () => {
      setState((s) => ({ ...s, wsState: 'error' }));
    };
    const handleLocation = (data: RiderLocation) => {
      lastMsgRef.current = Date.now();
      setState((s) => ({ ...s, riderLocation: data }));
    };
    const handleStatusChanged = (data: { toStatus: OrderStatus }) => {
      lastMsgRef.current = Date.now();
      setState((s) => ({ ...s, lastOrderStatus: data.toStatus }));
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('order:location', handleLocation);
    socket.on('order:status-changed', handleStatusChanged);

    // Why: 5s 心跳检查 WS 是否活跃，不活跃时启动 HTTP 轮询
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const checkTimer = setInterval(() => {
      const isStale = Date.now() - lastMsgRef.current > WS_TIMEOUT_MS;
      if (isStale && !pollTimer) {
        pollTimer = setInterval(async () => {
          try {
            const tracking = await orderApi.getTracking(orderId);
            setState((s) => ({
              ...s,
              lastOrderStatus: tracking.orderStatus,
              wsState: 'disconnected',
            }));
          } catch {
            // Why: 轮询失败静默忽略，下次再试；UI 显示最近一次状态
          }
        }, POLL_INTERVAL_MS);
      } else if (!isStale && pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }, WS_TIMEOUT_MS);

    return () => {
      clearInterval(checkTimer);
      if (pollTimer) clearInterval(pollTimer);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('order:location', handleLocation);
      socket.off('order:status-changed', handleStatusChanged);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [orderId, accessToken]);

  return state;
}
