import type { Coordinates } from './common';

export type TaskStatus = 'available' | 'accepted' | 'pickingUp' | 'delivering' | 'completed' | 'cancelled';

export type TaskStop = {
  title: string;
  address: string;
  coordinates?: Coordinates;
  contactName?: string;
  contactPhone?: string;
};

export type DeliveryTask = {
  id: string;
  orderId: string;
  status: TaskStatus;
  pickup: TaskStop;
  dropoff: TaskStop;
  fee: number;
  distanceKm: number;
  estimatedMinutes: number;
  items: string[];
  note?: string;
};
