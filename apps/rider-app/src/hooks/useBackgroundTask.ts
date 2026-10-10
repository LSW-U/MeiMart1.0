import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { buildLocationPayload, reportLocationHttp } from '../services/location';
import { captureError } from '../services/sentry';
import { tokenStorage } from '../services/token-storage';
import { showToast } from '../components/feedback/Toast';
import { translate, useTranslation } from '../i18n/useTranslation';

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
 * R-P1-7：回调内全量 try/catch + captureError——task 回调抛 rejection 在原生侧
 *   只打 expo-task-manager 内部日志，JS 崩溃上报（Sentry）完全看不到。
 */
TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  try {
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
  } catch (e) {
    // 失败策略不变（仅 warn 不重试），但必须 captureError 让崩溃上报可见
    captureError(e instanceof Error ? e : new Error(String(e)), { source: 'bg-location-task' });
    console.warn('[bg-location] task failed:', e);
  }
});

type UseBackgroundTaskOptions = {
  /** 启用条件：online && !isOffline && 有 currentOrderId && (Android 始终 / iOS 后台) */
  enabled: boolean;
  /** 当前配送订单 ID（同步到模块级 ref 供 task 回调用） */
  currentOrderId?: string;
};

export function useBackgroundTask(options: UseBackgroundTaskOptions) {
  const { enabled, currentOrderId } = options;
  const { language } = useTranslation();
  const [isRegistered, setIsRegistered] = useState(false);
  // ref 持有注册状态，避免 effect 依赖 isRegistered 造成 start→setState→重跑循环
  const isRegisteredRef = useRef(false);

  // 同步 orderId 到模块级 ref（task 回调读取最新值）；
  // R-P2-3：cleanup 置空——卸载后 task 回调不得再用旧 orderId 上报（陈旧引用）
  useEffect(() => {
    currentOrderIdRef = currentOrderId;
    return () => {
      currentOrderIdRef = undefined;
    };
  }, [currentOrderId]);

  useEffect(() => {
    // web 守卫：expo-location web stub 无 start/stopLocationUpdatesAsync（调用即
    // TypeError 非 UnavailabilityError），后台定位本就是原生专属场景。
    // 模块顶层 defineTask 保留（内存注册，task 永不被触发，无害）。
    if (Platform.OS === 'web') return;

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
      try {
        if (isRegisteredRef.current) return; // 已注册，避免重复 start
        // 前台权限（useLocation 也请求；此处独立确保 granted）
        const { status: fg } = await Location.requestForegroundPermissionsAsync();
        if (cancelled || fg !== 'granted') {
          // R-P1-7：权限拒绝给可操作提示（走系统设置），不只是 console.warn
          captureError(new Error('bg-location foreground permission denied'), {
            source: 'bg-location-task',
          });
          // 第四轮修复 P1-2（D5 改判版）：effect 内改用纯函数 translate(language,...)——
          // 原 deps 含 hook 的 t（每渲染新引用）→ 宿主重渲染即销毁重建定位任务（反复
          // start/stopLocationUpdatesAsync）。deps 收窄为 [enabled, language]：语言切换
          // 重建一次属预期，普通重渲染不再重启定位。
          showToast(translate(language, 'common.locationPermDenied'), 'error');
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
      } catch (e) {
        // R-P1-7：startLocationUpdatesAsync 可能 reject（系统限制/电量优化），不静默
        captureError(e instanceof Error ? e : new Error(String(e)), {
          source: 'bg-location-start',
        });
        console.warn('[bg-location] start failed:', e);
      }
    };
    // R-P1-7：start 内部已全量 try/catch，但这里再兜一层防未来改动破坏约定
    start().catch((e) => {
      captureError(e instanceof Error ? e : new Error(String(e)), { source: 'bg-location-start' });
    });

    return () => {
      cancelled = true;
      if (isRegisteredRef.current) {
        Location.stopLocationUpdatesAsync(TASK_NAME).catch(() => {});
        isRegisteredRef.current = false;
        setIsRegistered(false);
      }
    };
  }, [enabled, language]);

  return { isRegistered };
}
