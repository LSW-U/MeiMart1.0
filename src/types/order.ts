export type OrderHistoryStatus = 'completed' | 'cancelled' | 'transferred';

export type OrderHistoryItem = {
  id: string;
  orderNo: string;
  status: OrderHistoryStatus;
  completedAt: number;
  pickupName: string;
  pickupAddress: string;
  dropoffName: string;
  dropoffAddress: string;
  income: number;
  distanceKm: number;
  durationMinutes: number;
};
