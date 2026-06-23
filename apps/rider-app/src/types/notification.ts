export type NotificationCategory = 'task' | 'order' | 'wallet' | 'system';

export type NotificationItem = {
  id: string;
  category: NotificationCategory;
  titleKey: string;
  messageKey: string;
  vars?: Record<string, string | number>;
  createdAt: number;
  read: boolean;
  link?: string;
};
