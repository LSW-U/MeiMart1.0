import type { Coordinates } from './common';
import type { DeliveryTask } from './task';

export type RiderStatus = 'offline' | 'online' | 'busy';

export type RiderProfile = {
  id: string;
  name: string;
  phone: string;
  avatarUrl?: string;
  vehicleType?: string;
  licenseNumber?: string;
  status: RiderStatus;
  currentTaskId?: DeliveryTask['id'];
  currentLocation?: Coordinates;
};
