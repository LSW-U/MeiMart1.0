import { io, type Socket } from 'socket.io-client';

// 后端 WS 命名空间：/realtime（HTTP 在 /api/v1，WS 单独命名空间）
// WS URL 推导：API base URL 去掉 /api/v1 部分，得到 backend origin
const WS_URL =
  (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/api\/v1\/?$/, '') ||
  'http://localhost:3000';

export function connectRiderSocket(accessToken: string): Socket {
  return io(`${WS_URL}/realtime`, {
    auth: { token: `Bearer ${accessToken}` },
    // C7（R-P2-7）：开 polling 回退——弱网/受限代理下 websocket-only 可能永久连不上。
    // socket.io 默认先 polling 握手再升级 websocket，`transports: ['websocket']` 把
    // 回退路径禁死了；恢复默认（不传 transports）允许降档。
    reconnection: true,
    // C7：指数退避（socket.io 内建 reconnectionDelay * 2^n，封顶 reconnectionDelayMax）
    // + 有限次（10 次 ≈ 前几轮 1s/2s/4s/8s/16s/30s… 封顶 30s 共约 4 分钟）——
    // 原 Infinity + 固定 3s 在后端长宕时高频空转重连耗电；耗尽后由 token 刷新/页面
    // 重挂载重建 socket 通道（useRiderSocket 生命周期）。
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30_000,
    reconnectionAttempts: 10,
  });
}

export type { Socket };
