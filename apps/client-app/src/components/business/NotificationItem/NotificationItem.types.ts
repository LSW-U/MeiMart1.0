import type { Notification } from '@/types';

export interface NotificationItemProps {
  notification: Notification;
  onPress?: (notification: Notification) => void;
  /**
   * CTA 跳转（P23 D4）：卡片内富内容按钮（查看物流/立即付款/去抢购…）回调。
   * action 与 notification.data 由页面分发路由；缺省时 CTA 走 onPress 整卡行为。
   */
  onCta?: (action: string, notification: Notification) => void;
  /**
   * 批2（#3 通知管理，D4）：管理模式——复用收藏页卡片 selectMode 先例：
   * 整卡单 Pressable + 右上角选择圆圈（纯状态），勾选交互由页面层 onPress 分流。
   */
  selectMode?: boolean;
  isSelected?: boolean;
  testID?: string;
}
