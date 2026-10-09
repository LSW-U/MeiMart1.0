/**
 * @meimart/api-core — MeiMart1.0 client/rider 共享传输层核心（跨端基建统一 批3 A5）
 *
 * 本批范围（批3）：WS 统一封装 createTrackingSocket——
 *   - transports 默认含 polling 回退（S-P1-8：websocket-only 在弱网/受限代理可能永久连不上）
 *   - 指数退避封顶 + attempts 上限（自愈参数单点见 wsDefaults.ts，待 D7 校准）
 *   - NetInfo 网络恢复重置重连（弱网恢复立即重连，不等下一轮退避）
 *
 * 批4 扩展（不在本批）：axios 工厂 / refresh 单飞 / tokenStorage / ApiError / redact。
 *
 * 蓝本：rider ws.ts（polling 回退 + 退避 + 有限次，方案 M2「rider 版更完善」原则同批2）。
 */
import { io, type Socket } from 'socket.io-client';
import NetInfo from '@react-native-community/netinfo';
import {
  WS_RECONNECTION_ATTEMPTS,
  WS_RECONNECTION_DELAY_MS,
  WS_RECONNECTION_DELAY_MAX_MS,
} from './wsDefaults';

export {
  WS_RECONNECTION_ATTEMPTS,
  WS_RECONNECTION_DELAY_MS,
  WS_RECONNECTION_DELAY_MAX_MS,
} from './wsDefaults';

/** createTrackingSocket 选项（两端 URL/命名空间/auth 差异在此注入） */
export interface TrackingSocketOptions {
  /** 完整 WS 地址（含命名空间，如 `http://host:3000/realtime`） */
  url: string;
  /** 鉴权 token（本工厂统一拼 `Bearer ` 前缀后放入 auth.token，调用方传裸 token） */
  accessToken: string;
}

/** 网络恢复探测最小间隔（防 NetInfo 抖动连发 reset） */
const NET_RESET_MIN_INTERVAL_MS = 3000;

/**
 * 订阅「网络恢复」信号并执行回调，返回退订函数。
 * Why: 弱网长宕时退避封顶 30s，网络刚恢复的那 30s 内用户看到假离线；
 * NetInfo 恢复事件立即重置 socket.io 重连计时器，把恢复感知压到秒级。
 * isInternetReachable 三态语义：false→true 视为恢复（null=未知不触发，与 client
 * useNetworkQuality reachableOrUnknown 同口径）。
 */
function onNetworkRecovery(callback: () => void): () => void {
  let prevReachable: boolean | null = null;
  let lastFire = 0;
  return NetInfo.addEventListener((state) => {
    const reachable = state.isInternetReachable;
    const recovered = prevReachable === false && reachable === true;
    prevReachable = reachable;
    if (!recovered) return;
    const now = Date.now();
    if (now - lastFire < NET_RESET_MIN_INTERVAL_MS) return;
    lastFire = now;
    callback();
  });
}

/**
 * 创建跨端统一 WS 连接（只建连，不 join room——join 必须放 connect 回调，
 * socket.io 重连不重放 emit，见 client tracking.ts 既有注释）。
 *
 * 调用方（client tracking.ts / rider ws.ts）保留各自 URL 推导与 join 语义，
 * 本工厂统一传输与自愈行为。
 *
 * 批3 审查 P2-1 修复：NetInfo 退订不挂 socket 事件（socket.io reconnection:true 下
 * 一断连即发 disconnect，退订若挂 disconnect 会在「长宕退避期」——恰是该特性
 * 的目标窗口——立即失效）。改为随连接返回 destroy()，由调用方在 useEffect
 * cleanup 调用，与「join 放 connect 回调」同类生命周期纪律。
 */
export function createTrackingSocket({ url, accessToken }: TrackingSocketOptions): TrackingSocket {
  const socket = io(url, {
    auth: { token: `Bearer ${accessToken}` },
    // S-P1-8：不传 transports = polling 握手再升级 websocket（允许降档）；
    // 显式传 ['websocket'] 会把回退路径禁死，弱网/受限代理下永久连不上。
    reconnection: true,
    reconnectionDelay: WS_RECONNECTION_DELAY_MS,
    reconnectionDelayMax: WS_RECONNECTION_DELAY_MAX_MS,
    reconnectionAttempts: WS_RECONNECTION_ATTEMPTS,
  });

  // 网络恢复立即重置重连计时器（尝试次数同步归零，恢复后立即重连）
  const unsubscribeNetInfo = onNetworkRecovery(() => {
    if (!socket.connected) {
      socket.connect();
    }
  });

  // 调用方销毁：断连 + NetInfo 退订（幂等；不调 destroy 则退避重连照常进行）
  const destroy = (): void => {
    unsubscribeNetInfo();
    socket.disconnect();
  };

  return { socket, destroy };
}

/** createTrackingSocket 返回值：socket 本体 + 调用方生命周期销毁句柄（批3 P2-1） */
export interface TrackingSocket {
  socket: Socket;
  /** 断开连接并退订 NetInfo 监听；调用方在 useEffect cleanup 中调用 */
  destroy: () => void;
}
