import type { Order, OrderStatus } from '@/types';

export type OrderAction = 'pay' | 'cancel' | 'track' | 'review' | 'repurchase' | 'after-sales';

export interface OrderCardProps {
  order: Order;
  onPress?: (order: Order) => void;
  onAction?: (action: OrderAction, order: Order) => void;
  testID?: string;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending Payment',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunding: 'Refund In Progress',
};
