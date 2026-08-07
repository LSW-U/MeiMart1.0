import { io, type Socket } from 'socket.io-client';
import Constants from 'expo-constants';

// Why: 后端 WS 主通道（realtime.gateway.ts），客户端订阅 order room 后收到状态变更和骑手位置。
// 5s 无 WS 消息时由 useTracking hook 降级到 HTTP 轮询（orders.getTracking）。

const env = Constants.expoConfig?.extra as {
  API_BASE_URL?: string;
};

// Why: API_BASE_URL 形如 http://localhost:3000/api/v1，WS 走同源去 /api/v1 加 /realtime
function buildWsUrl(): string {
  const apiBase = env?.API_BASE_URL ?? 'http://localhost:3000/api/v1';
  return apiBase.replace(/\/api\/v\d+\/?$/, '') + '/realtime';
}

export interface RiderLocation {
  orderId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  timestamp: number;
  riderId: string;
}

export interface OrderStatusChange {
  orderId: string;
  fromStatus: string;
  toStatus: string;
  operatorId?: string;
  reason?: string;
  timestamp: string;
}

export type WsConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * 连接订单配送追踪 WS（只建连，不 join room）。
 * 客户端用 accessToken 鉴权（role=customer 自动加入对应 room）。
 *
 * ⚠️ 本函数只负责建连，**不 emit join:order**。
 * 调用方必须在 `socket.on('connect', ...)` 回调里 emit `join:order { orderId }`，
 * 否则重连后 socket.io 发件箱缓冲不重放，客户端会永久掉出 order room，
 * 收不到 order:location / order:status-changed。
 *
 * 调用方在 useEffect 内调用，return 时 socket.disconnect() 释放。
 */
export function connectOrderTracking(accessToken: string): Socket {
  const socket = io(buildWsUrl(), {
    auth: { token: `Bearer ${accessToken}` },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 3000,
    reconnectionAttempts: 5,
  });

  return socket;
}
