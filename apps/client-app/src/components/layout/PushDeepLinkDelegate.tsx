/**
 * 推送点击深链委托（批B B2，方案v2 §3.5 client）
 *
 * 三场景：
 *   前台/后台 — addNotificationResponseListener（app 运行中点击通知）
 *   冷启动   — getLastNotificationResponseAsync（app 由通知点击拉起，
 *              AppProviders 挂载完成后才路由，防白屏期跳转丢失/被后续导航覆盖）
 *
 * 路由：routeFromPushData（分流规则与 P23 页面 onPress 保持一致，两份实现待后续批合一）；
 *       无 data / 未知 type → 进通知页（不报错，任务书 B2）。
 *
 * mock/web：不挂 listener（shouldInitPush 短路）。
 * 导航就绪时机：冷启动路径由本组件挂载保证（AppProviders 已挂载 → Root Stack 已构建，
 * router.push 可用）；listener 路径 app 本就在前台，导航栈已就绪。
 */
import { useEffect } from 'react';
import { router } from 'expo-router';
import {
  getNotificationsModule,
  shouldInitPush,
  routeFromPushData,
  type PushRoute,
} from '@/services/push';

const NOTIFICATIONS_PAGE = '/service/notifications';

/** 响应 → 路由目标（含降级），导出供单测 */
export function resolveRouteFromResponse(
  response: { notification: { request: { content: { data?: Record<string, unknown> } } } } | null,
): PushRoute {
  if (!response) return { path: null };
  // Expo Push data 契约：后端 data 原样透传（send-push-to-user.ts 注入 token 字段，路由不消费）
  const content = response.notification?.request?.content;
  const data = content?.data;
  const type = typeof data?.type === 'string' ? (data.type as string) : undefined;
  return routeFromPushData(data, type);
}

function navigateFromResponse(
  response: { notification: { request: { content: { data?: Record<string, unknown> } } } } | null,
): void {
  const { path } = resolveRouteFromResponse(response);
  // 无 data / 未知 type 降级：进通知页（任务书 B2「不报错，进通知页」）
  router.push(path ?? NOTIFICATIONS_PAGE);
}

export function PushDeepLinkDelegate(): null {
  useEffect(() => {
    if (!shouldInitPush()) return;
    const notifications = getNotificationsModule();
    if (!notifications) return;

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    // 冷启动：listener 挂上后查 initial response（防丢：查到才路由，一次即清）
    void notifications.getLastNotificationResponseAsync().then((initial) => {
      if (!cancelled && initial) navigateFromResponse(initial);
    });

    const subscription = notifications.addNotificationResponseReceivedListener((response) => {
      navigateFromResponse(response);
    });
    unsubscribe = () => subscription.remove();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return null;
}
