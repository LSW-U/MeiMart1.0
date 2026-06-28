import { io, type Socket } from 'socket.io-client';

// 后端 WS 命名空间：/realtime（HTTP 在 /api/v1，WS 单独命名空间）
// WS URL 推导：API base URL 去掉 /api/v1 部分，得到 backend origin
const WS_URL =
  (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/api\/v1\/?$/, '') ||
  'http://localhost:3000';

export function connectRiderSocket(accessToken: string): Socket {
  return io(`${WS_URL}/realtime`, {
    auth: { token: `Bearer ${accessToken}` },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 3000,
    reconnectionAttempts: Infinity,
  });
}

export type { Socket };
