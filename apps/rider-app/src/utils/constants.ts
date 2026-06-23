export const APP_NAME = 'Mei Delivery';

export const SUPPORTED_LOCALES = ['en', 'tet', 'pt', 'id'] as const;

export const DEFAULT_CURRENCY = 'USD';

export const DEFAULT_COORDINATES = {
  latitude: -8.5569,
  longitude: 125.5603,
};

export const TASK_STATUS = {
  available: 'available',
  accepted: 'accepted',
  pickingUp: 'pickingUp',
  delivering: 'delivering',
  completed: 'completed',
  cancelled: 'cancelled',
} as const;

export const RIDER_STATUS = {
  offline: 'offline',
  online: 'online',
  busy: 'busy',
} as const;
