import { createTrackingSocket, type TrackingSocket } from '@meimart/api-core';
import { getExtra } from '@/config/app-config';

// Why: 后端 WS 主通道（realtime.gateway.ts），客户端订阅 order room 后收到状态变更和骑手位置。
// 5s 无 WS 消息时由 useTracking hook 降级到 HTTP 轮询（orders.getTracking）。

const env = getExtra();

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
 * 调用方在 useEffect 内调用，return 时调 destroy()（断连 + NetInfo 退订，批3 P2-1）。
 */
export function connectOrderTracking(accessToken: string): TrackingSocket {
  // 批3 A5：自愈参数（退避/attempts/网络恢复重连）上收 @meimart/api-core 单源；
  // 不传 transports（原 ['websocket'] 强制直连删除）→ 恢复 socket.io 默认
  // polling→websocket 升级路径，弱网/webview 环境下 websocket 握手失败仍可回退 polling。
  return createTrackingSocket({ url: buildWsUrl(), accessToken });
}
