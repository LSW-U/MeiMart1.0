import { API_BASE_URL } from './api';
import type { Coordinates } from '@/src/types/common';

/**
 * 骑手位置上报 service
 *
 * 双通道（P0 后台定位，CLAUDE.md 规则 16）：
 *   - 前台：useLocation.ts watchPositionAsync + socket.emit('location:update')（WS 通道）
 *   - 后台：useBackgroundTask.ts startLocationUpdatesAsync + reportLocationHttp（HTTP 通道）
 *
 * 后端：
 *   - WS handler：realtime.gateway.ts handleLocationUpdate（P1-9 骑手-订单校验）
 *   - HTTP 端点：POST /api/v1/rider/location/report（P0 后台定位，转发为 order:location WS 广播）
 *
 * buildLocationPayload 是 WS 和 HTTP 共用的 payload 构造（speed/heading 单位换算），避免逻辑漂移。
 */

/** 骑手位置上报 payload（与后端 ReportLocationRequest + WS RiderLocationUpdate 对齐） */
export interface RiderLocationPayload {
  orderId: string;
  lat: number;
  lng: number;
  /** 速度 km/h（m/s → km/h 换算后） */
  speed?: number;
  /** 方向 0-360 */
  heading?: number;
  timestamp: number;
}

/**
 * 从 expo-location 坐标构造上报 payload。
 *
 * speed：expo-location coords.speed 是 m/s，后端要 km/h → Math.round(s*3.6*10)/10；
 *        iOS 静止时为 -1 视为无效省略字段；null/undefined 同样省略。
 * heading：coords.heading 直接传（度 0-360）；NaN / 超范围省略。
 *
 * WS 通道（useLocation socket.emit）和 HTTP 通道（reportLocationHttp fetch）共用，
 * 避免单位换算逻辑两处维护。
 */
export function buildLocationPayload(
  coords: {
    latitude: number;
    longitude: number;
    speed?: number | null;
    heading?: number | null;
  },
  orderId: string,
): RiderLocationPayload {
  const rawSpeed = coords.speed;
  const speed =
    typeof rawSpeed === 'number' && rawSpeed >= 0
      ? Math.round(rawSpeed * 3.6 * 10) / 10
      : undefined;
  const rawHeading = coords.heading;
  const heading =
    typeof rawHeading === 'number' &&
    !Number.isNaN(rawHeading) &&
    rawHeading >= 0 &&
    rawHeading <= 360
      ? rawHeading
      : undefined;

  return {
    orderId,
    lat: coords.latitude,
    lng: coords.longitude,
    timestamp: Date.now(),
    ...(speed !== undefined ? { speed } : {}),
    ...(heading !== undefined ? { heading } : {}),
  };
}

/**
 * 后台 task 用的 HTTP 上报（绕开 axios api 实例）。
 *
 * 设计要点：
 *   - 用原生 fetch + 显式 Bearer header（token 由调用方异步取好传入）
 *   - **不走 axios api 实例**：api 实例 401 拦截会触发 tokenStorage.clear + onUnauthorized
 *     登出回调，后台 task 不能登出（后台 task 失败仅 warn，不弹 UI、不登出）
 *   - 失败仅 console.warn：弱网降级（规则 18「离线停止上报」）；不入队、不重试、不抛错
 *     到 task 框架（避免后台 task 被标记失败，下一个 5s 周期自然重试）
 */
export async function reportLocationHttp(
  payload: RiderLocationPayload,
  token: string,
): Promise<void> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/rider/location/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      // 401 token 过期 / 403 订单不归属（currentOrderId 过时）/ 404 订单不存在
      // 后台 task 无法处理这些场景，仅记录（回前台后 taskLists 刷新即恢复）
      console.warn('[reportLocationHttp] failed:', res.status, payload.orderId);
    }
  } catch (e) {
    // 网络异常（弱网/断网）— 不重试，等下一个 5s 周期
    console.warn('[reportLocationHttp] network error:', e);
  }
}

/**
 * @deprecated 历史残留 mock（useLocationStore.report + LocationTracker 调用）。
 * 后端从未提供「无 orderId 的坐标上报」端点，此 mock 仅 50ms 延迟模拟，未真正上报。
 * 真实位置上报走 buildLocationPayload + reportLocationHttp（后台）或 socket.emit（前台）。
 * 待 useLocationStore.report / LocationTracker 清理后可移除。
 */
export const locationApi = {
  async report(_coordinates: Coordinates): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 50));
  },
};
