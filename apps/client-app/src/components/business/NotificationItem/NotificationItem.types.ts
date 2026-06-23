import type { Notification } from '@/types';

export interface NotificationItemProps {
  notification: Notification;
  onPress?: (notification: Notification) => void;
  testID?: string;
}
