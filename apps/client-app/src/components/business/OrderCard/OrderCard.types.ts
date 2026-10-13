import type { Order } from '@/types';

// Why: OrderAction 类型从 orderStatusConfig 派生，避免散落定义。
// 状态相关文案/颜色/图标/操作集中到 @/lib/orderStatusConfig 维护，本文件只保留组件 props 契约。
export type { OrderAction } from '@/lib/orderStatusConfig';

export interface OrderCardProps {
  order: Order;
  onPress?: (order: Order) => void;
  onAction?: (action: import('@/lib/orderStatusConfig').OrderAction, order: Order) => void;
  testID?: string;
  // 批3（#5 订单删除）：管理模式（批2 通知管理同形态）——整卡单点按分流勾选/导航，
  // 圆圈为纯状态非独立按钮（避免 Web 嵌套 Pressable）；选中态 primary 边框
  selectMode?: boolean;
  isSelected?: boolean;
}
