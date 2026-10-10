import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import {
  connectOrderTracking,
  type RiderLocation,
  type WsConnectionState,
} from '@/services/tracking';
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
  // P11 ETA:任务创建时算的预估送达（now+45min），WS 不推，从 getTracking 拿
  estimatedArrival: string | null;
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
    estimatedArrival: null,
  });

  // Why: 用 lazy ref 避免 useRef(Date.now()) 触发 react-hooks/purity 规则（render 期不允许 impure 调用）
  const socketRef = useRef<Socket | null>(null);
  const lastMsgRef = useRef<number>(0);

  useEffect(() => {
    if (!orderId || !accessToken) return;

    // Why: 不在 effect body 直接 setState('connecting')（react-hooks/set-state-in-effect 规则），
    // socket 自身事件（connect / connect_error / disconnect）会驱动 wsState 更新
    // 批3 P2-1：connectOrderTracking 返回 { socket, destroy }——destroy 负责断连 + NetInfo 退订
    // 第四轮修复 P1-3（D7）：token 经 connectOrderTracking 包成 getter 动态取（重连握手
    // 自动带新 token），effect 不再依赖 accessToken——token 变化时 effect 重建反而丢 join 语义
    const { socket, destroy } = connectOrderTracking(accessToken);
    socketRef.current = socket;
    lastMsgRef.current = Date.now();

    const handleConnect = () => {
      lastMsgRef.current = Date.now();
      setState((s) => ({ ...s, wsState: 'connected' }));
      // 关键：每次 connect（含重连）都要 re-join order room。
      // socket.io 发件箱缓冲只在首次 connect 时 flush，重连不重放，
      // 不在这里 re-join 会永久掉出 order:{orderId} room，收不到 order:location。
      socket.emit('join:order', { orderId });
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

    // C-P2-14: unmount/依赖变化后的 setState 守卫——getTracking().then 与 30s 轮询回调
    //   都可能落在 cleanup 之后（慢网响应迟到/轮询 in-flight），无守卫会对已卸载组件 setState。
    let cancelled = false;

    // P11 ETA:初始拿一次 eta（task.estimatedArrival 是静态值，WS 不推，只在 getTracking 返回）
    orderApi
      .getTracking(orderId)
      .then((tracking) => {
        if (cancelled) return;
        setState((s) => ({ ...s, estimatedArrival: tracking.task?.estimatedArrival ?? null }));
      })
      .catch(() => {
        // Why: 初始拿 eta 失败静默，banner 降级 etaPlaceholder
      });

    // Why: 5s 心跳检查 WS 是否活跃，不活跃时启动 HTTP 轮询
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const checkTimer = setInterval(() => {
      const isStale = Date.now() - lastMsgRef.current > WS_TIMEOUT_MS;
      if (isStale && !pollTimer) {
        pollTimer = setInterval(async () => {
          try {
            const tracking = await orderApi.getTracking(orderId);
            if (cancelled) return;
            setState((s) => ({
              ...s,
              lastOrderStatus: tracking.orderStatus,
              estimatedArrival: tracking.task?.estimatedArrival ?? null,
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
      cancelled = true;
      clearInterval(checkTimer);
      if (pollTimer) clearInterval(pollTimer);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('order:location', handleLocation);
      socket.off('order:status-changed', handleStatusChanged);
      destroy(); // 批3 P2-1：断连 + NetInfo 退订（原 socket.disconnect() 释放改走工厂销毁句柄）
      socketRef.current = null;
    };
    // 第四轮修复 P1-3（D7）：deps 改 [orderId]——token 不再驱动 effect 重建（统一经
    // getAccessToken 动态取，重连握手消化轮换，避免重建丢 join 语义）。
    // accessToken 仅作「是否已登录」守卫快照：登录前 effect 直接 return，登录后由
    // orderId 变化或重挂载建连（与 rider useRiderSocket「effect 内异步取 token」同口径）。
    // 原因：accessToken 是登录守卫快照，真 token 经 getAccessToken 每次握手动态取；
    // 若补进 deps，token 刷新会重建 effect → 断开 socket 丢 room join 语义
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  return state;
}
