import type { DeliveryTask } from './task';

export type OrderStatus = 'pending' | 'assigned' | 'pickedUp' | 'delivered' | 'cancelled';

export type OrderHistoryItem = {
  id: string;
  taskId: DeliveryTask['id'];
  status: OrderStatus;
  customerName: string;
  shopName: string;
  deliveredAt?: string;
  earning: number;
};
