import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useEffect, useRef, useState } from 'react';

import { buildLocationPayload, reportLocationHttp } from '../services/location';
import { tokenStorage } from '../services/token-storage';

/**
 * 后台定位 hook（P0 技术债，CLAUDE.md 规则 16）
 *
 * 仅「配送中」（有 currentOrderId）才启，固定 5s（规则 18 配送档）。
 *
 * 通道：HTTP /api/v1/rider/location/report（原生 fetch，绕开 axios 401 拦截）
 *   - iOS 后台 socket.io 会被系统挂起 ~30s，前台 WS 通道不可靠 → 后台走 HTTP 短请求
 *   - 后端 HTTP 端点转发为 order:location WS 广播（与前台 WS 通道合一）
 *
 * 失败策略（规则 18「离线停止上报」）：
 *   - 弱网/断网/token 过期/订单过时 → 仅 console.warn，不入队、不重试、不登出
 *   - 下一个 5s 周期自然重试；回前台后 taskLists 刷新恢复 currentOrderId
 */

const TASK_NAME = 'rider-background-location';
const INTERVAL_MS = 5_000; // 配送中固定 5s（规则 18 配送档）
const DISTANCE_M = 5;

/**
 * 模块级 ref：task 回调是模块级闭包（TaskManager.defineTask），访问不到 hook 实例的 state。
 * 用模块级变量持有最新 orderId，hook 内 useEffect 同步。
 */
let currentOrderIdRef: string | undefined;

/**
 * 模块顶层 defineTask（expo-task-manager 要求，模块加载时注册一次）。
 * task 由 startLocationUpdatesAsync 触发，回调里读 currentOrderIdRef + 上报。
 */
TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('[bg-location] task error:', error.message);
    return;
  }
  const oid = currentOrderIdRef;
  if (!oid) return; // 已无配送任务，等 unregister 生效

  const loc = (data as { locations?: Location.LocationObject[] })?.locations?.[0];
  if (!loc) return;

  const token = await tokenStorage.get();
  if (!token) {
    console.warn('[bg-location] no token, skip');
    return;
  }

  await reportLocationHttp(buildLocationPayload(loc.coords, oid), token);
});

type UseBackgroundTaskOptions = {
  /** 启用条件：online && !isOffline && 有 currentOrderId && (Android 始终 / iOS 后台) */
  enabled: boolean;
  /** 当前配送订单 ID（同步到模块级 ref 供 task 回调用） */
  currentOrderId?: string;
};

export function useBackgroundTask(options: UseBackgroundTaskOptions) {
  const { enabled, currentOrderId } = options;
  const [isRegistered, setIsRegistered] = useState(false);
  // ref 持有注册状态，避免 effect 依赖 isRegistered 造成 start→setState→重跑循环
  const isRegisteredRef = useRef(false);

  // 同步 orderId 到模块级 ref（task 回调读取最新值）
  useEffect(() => {
    currentOrderIdRef = currentOrderId;
  }, [currentOrderId]);

  useEffect(() => {
    if (!enabled) {
      if (isRegisteredRef.current) {
        Location.stopLocationUpdatesAsync(TASK_NAME).catch((e) =>
          console.warn('[bg-location] stop failed:', e),
        );
        isRegisteredRef.current = false;
        setIsRegistered(false);
      }
      return;
    }

    let cancelled = false;
    const start = async () => {
      if (isRegisteredRef.current) return; // 已注册，避免重复 start
      // 前台权限（useLocation 也请求；此处独立确保 granted）
      const { status: fg } = await Location.requestForegroundPermissionsAsync();
      if (cancelled || fg !== 'granted') {
        console.warn('[bg-location] foreground permission denied');
        return;
      }
      // 后台权限（iOS「始终允许」/ Android「后台定位」）
      const { status: bg } = await Location.requestBackgroundPermissionsAsync();
      if (cancelled || bg !== 'granted') {
        console.warn('[bg-location] background permission denied');
        return;
      }
      await Location.startLocationUpdatesAsync(TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: INTERVAL_MS,
        distanceInterval: DISTANCE_M,
        // iOS：顶部显示「后台定位中」指示器，告知用户被追踪
        showsBackgroundLocationIndicator: true,
      });
      if (!cancelled) {
        isRegisteredRef.current = true;
        setIsRegistered(true);
      }
    };
    void start();

    return () => {
      cancelled = true;
      if (isRegisteredRef.current) {
        Location.stopLocationUpdatesAsync(TASK_NAME).catch(() => {});
        isRegisteredRef.current = false;
        setIsRegistered(false);
      }
    };
  }, [enabled]);

  return { isRegistered };
}
