import type { Order } from '@/types';

// Why: OrderAction 类型从 orderStatusConfig 派生，避免散落定义。
// 状态相关文案/颜色/图标/操作集中到 @/lib/orderStatusConfig 维护，本文件只保留组件 props 契约。
export type { OrderAction } from '@/lib/orderStatusConfig';

export interface OrderCardProps {
  order: Order;
  onPress?: (order: Order) => void;
  onAction?: (action: import('@/lib/orderStatusConfig').OrderAction, order: Order) => void;
  testID?: string;
}

