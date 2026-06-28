import type { IconName, OrderStatus } from '@/types';

// Why: 后端 OrderStatus 有 10 个值，前端组件需要为每个状态展示文案/颜色/图标/操作按钮。
// 集中管理避免散落在 OrderCard / OrderDetailPage / OrderListPage 三处组件，改一处即生效。

export interface OrderStatusVisual {
  /** UI 显示文案（zh/en 双语，按当前 locale 取） */
  label: { zh: string; en: string };
  /** 状态徽章配色（bg 背景 / fg 文字 / dot 圆点） */
  pill: { bg: string; fg: string; dot: string };
  /** MaterialCommunityIcons 图标名 */
  icon: IconName;
}

export const ORDER_STATUS_VISUAL: Record<OrderStatus, OrderStatusVisual> = {
  PENDING_PAYMENT: {
    label: { zh: '待付款', en: 'Pending Payment' },
    pill: { bg: '#fef3c7', fg: '#b45309', dot: '#f59e0b' },
    icon: 'clock-outline' as IconName,
  },
  PENDING_CONFIRM: {
    label: { zh: '待确认', en: 'Pending Confirm' },
    pill: { bg: '#fef3c7', fg: '#b45309', dot: '#f59e0b' },
    icon: 'clock-check-outline' as IconName,
  },
  CONFIRMED: {
    label: { zh: '已确认', en: 'Confirmed' },
    pill: { bg: '#dbeafe', fg: '#1d4ed8', dot: '#3b82f6' },
    icon: 'check-circle-outline' as IconName,
  },
  PICKED: {
    label: { zh: '已拣货', en: 'Picked' },
    pill: { bg: '#dbeafe', fg: '#1d4ed8', dot: '#3b82f6' },
    icon: 'package-variant-closed' as IconName,
  },
  OUT_FOR_DELIVERY: {
    label: { zh: '配送中', en: 'Out for Delivery' },
    pill: { bg: '#dbeafe', fg: '#1d4ed8', dot: '#3b82f6' },
    icon: 'truck-delivery-outline' as IconName,
  },
  DELIVERED_PAID: {
    label: { zh: '已送达', en: 'Delivered' },
    pill: { bg: '#d1fae5', fg: '#047857', dot: '#10b981' },
    icon: 'check-circle-outline' as IconName,
  },
  DELIVERED_UNPAID: {
    label: { zh: '已送达（货到付款）', en: 'Delivered (COD)' },
    pill: { bg: '#d1fae5', fg: '#047857', dot: '#10b981' },
    icon: 'check-circle-outline' as IconName,
  },
  DELIVERED: {
    label: { zh: '已送达', en: 'Delivered' },
    pill: { bg: '#d1fae5', fg: '#047857', dot: '#10b981' },
    icon: 'check-circle-outline' as IconName,
  },
  COMPLETED: {
    label: { zh: '已完成', en: 'Completed' },
    pill: { bg: '#d1fae5', fg: '#047857', dot: '#10b981' },
    icon: 'star-check-outline' as IconName,
  },
  CANCELLED: {
    label: { zh: '已取消', en: 'Cancelled' },
    pill: { bg: '#fee2e2', fg: '#b91c1c', dot: '#ef4444' },
    icon: 'close-circle-outline' as IconName,
  },
};

export type OrderAction =
  | 'pay'
  | 'cancel'
  | 'track'
  | 'review'
  | 'repurchase'
  | 'after-sales';

export interface OrderActionDescriptor {
  label: { zh: string; en: string };
  action: OrderAction;
  primary?: boolean;
}

// Why: 不同状态显示不同操作按钮，集中管理避免 OrderCard 散落 switch
export function getOrderActions(status: OrderStatus): OrderActionDescriptor[] {
  switch (status) {
    case 'PENDING_PAYMENT':
      return [
        { label: { zh: '取消订单', en: 'Cancel' }, action: 'cancel' },
        { label: { zh: '立即付款', en: 'Pay Now' }, action: 'pay', primary: true },
      ];
    case 'PENDING_CONFIRM':
    case 'CONFIRMED':
      return [{ label: { zh: '查看详情', en: 'Details' }, action: 'track' }];
    case 'PICKED':
    case 'OUT_FOR_DELIVERY':
      return [{ label: { zh: '查看物流', en: 'Track' }, action: 'track', primary: true }];
    case 'DELIVERED_PAID':
    case 'DELIVERED_UNPAID':
    case 'DELIVERED':
      return [
        { label: { zh: '申请售后', en: 'After-Sales' }, action: 'after-sales' },
        { label: { zh: '评价', en: 'Review' }, action: 'review', primary: true },
      ];
    case 'COMPLETED':
      return [
        { label: { zh: '再次购买', en: 'Buy Again' }, action: 'repurchase', primary: true },
      ];
    case 'CANCELLED':
      return [{ label: { zh: '再次购买', en: 'Buy Again' }, action: 'repurchase', primary: true }];
  }
}

// Why: 前端 tab 是 UI 概念，1 tab 对应 1 后端 status（all 表示不过滤）
export type OrderTabKey = 'all' | OrderStatus;

export const ORDER_TABS: { key: OrderTabKey; labelKey: string }[] = [
  { key: 'all', labelKey: 'common.all' },
  { key: 'PENDING_PAYMENT', labelKey: 'order.statusToPay' },
  { key: 'CONFIRMED', labelKey: 'order.statusToShip' },
  { key: 'OUT_FOR_DELIVERY', labelKey: 'order.statusToReceive' },
  { key: 'DELIVERED', labelKey: 'order.status.delivered' },
];
