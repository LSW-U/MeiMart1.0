import type { Notification } from '@/types';

export interface NotificationItemProps {
  notification: Notification;
  onPress?: (notification: Notification) => void;
  /**
   * CTA 跳转（P23 D4）：卡片内富内容按钮（查看物流/立即付款/去抢购…）回调。
   * action 与 notification.data 由页面分发路由；缺省时 CTA 走 onPress 整卡行为。
   */
  onCta?: (action: string, notification: Notification) => void;
  testID?: string;
}
