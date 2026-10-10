import type { Socket } from 'socket.io-client';
import { createTrackingSocket, type TrackingSocket } from '@meimart/api-core';
import { getExtra } from '../config/app-config';

// 后端 WS 命名空间：/realtime（HTTP 在 /api/v1，WS 单独命名空间）
// WS URL 推导：API base URL 去掉 /api/v1 部分，得到 backend origin
// 批3 A10：env 迁 expo-constants extra（app.config.ts 注入）
const WS_URL =
  (getExtra()?.API_BASE_URL ?? '').replace(/\/api\/v1\/?$/, '') || 'http://localhost:3000';

export function connectRiderSocket(accessToken: string): TrackingSocket {
  // 批3 A5：连接工厂 + 自愈参数（polling 回退默认/指数退避封顶/attempts 上限/
  // NetInfo 恢复重置）上收 @meimart/api-core 单源（wsDefaults.ts，待后端 D7 长宕语义
  // 结论校准）——原 C7/R-P2-7 本地 io() 配置整段删除，两端行为同源。
  // 批3 P2-1：返回 { socket, destroy }，调用方（useRiderSocket）在 cleanup 调 destroy。
  // 第四轮修复 P1-3（D4）：token 改函数式注入——accessToken 参数语义保持「调用时刻的
  // 裸 token」，包成 getter 后工厂每次重连握手动态执行；调用方（useRiderSocket）签名
  // 不变（token 仍在 effect 内异步取，取法不变）。
  return createTrackingSocket({ url: `${WS_URL}/realtime`, getAccessToken: () => accessToken });
}

export type { Socket };
