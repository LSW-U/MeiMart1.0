/**
 * 推送事件监听 + 深链路由（批C C3，方案v2 §3.5 rider）
 *
 * 三场景（对齐 client-app 批B 同款语义）：
 *   - 前台：setNotificationHandler 展示 alert（iOS 前台默认不弹）
 *   - 点击（前台/后台）：addNotificationResponseReceivedListener → routeByPushData
 *   - 冷启动：getLastNotificationResponseAsync → routeByPushData（root 挂载后一次）
 *
 * 深链映射（对齐 notification.ts deriveLink mock link 语义，勿丢钱包深链）：
 *   data.taskId → /(main)/tasks
 *   data.orderId → /order/:id（category WALLET 有 orderId 不会发生，wallet 无 id → earnings）
 *   data.category=WALLET / data.withdrawId / data.settlementId → /(main)/earnings
 *   无 data/未匹配 → /notifications（通知页兜底，不报错）
 */
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import type { EventSubscription } from 'expo-modules-core';

type PushData = Record<string, unknown>;

// 前台 iOS 默认静默：显式声明弹 banner + 响铃（Android 通道通知由系统管理）
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function routeByPushData(data: PushData | null | undefined): void {
  const d = data ?? {};
  const orderId = typeof d.orderId === 'string' ? d.orderId : undefined;
  const taskId = typeof d.taskId === 'string' ? d.taskId : undefined;
  const isWallet =
    d.category === 'WALLET' ||
    typeof d.withdrawId === 'string' ||
    typeof d.settlementId === 'string';

  if (isWallet) {
    // WALLET 深链不丢：→ earnings（订单/任务 id 不存在于钱包语义）
    router.push('/(main)/earnings');
  } else if (taskId) {
    // RIDER_TASK 事件 data 双键 { taskId, orderId }——任务分配/失败优先进任务列表
    router.push('/(main)/tasks');
  } else if (orderId) {
    router.push(`/order/${orderId}`);
  } else {
    // 无 data/未匹配兜底进通知页（方案 v2 §3.5：不报错）
    router.push('/notifications');
  }
}

export { routeByPushData };

function extractData(response: Notifications.NotificationResponse): PushData | null {
  return response.notification.request.content.data as PushData | null;
}

/**
 * root 挂载订阅（app/_layout.tsx 调用一次；app 生命周期内 root 不卸载）。
 * 内部 useEffect 自带 cleanup 解注 listener（冷启动查询是一次性 Promise 无需解注）。
 */
export function usePushDeepLink(): void {
  useEffect(() => {
    // 冷启动：点推送图标拉起 app（JS 重新执行），initial response 落在 root 挂载前
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) routeByPushData(extractData(response));
    });

    const subscription: EventSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        routeByPushData(extractData(response));
      },
    );
    return () => subscription.remove();
  }, []);
}

/** 平台守卫提示：web 无推送（push-token.ts 已跳过注册），listener 注册无害保留 */
export function isPushSupported(): boolean {
  return Platform.OS !== 'web';
}
