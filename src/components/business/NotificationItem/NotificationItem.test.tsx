import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { NotificationItem } from './NotificationItem';
import type { Notification } from '@/types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const notification: Notification = {
  id: 'n1',
  title: 'Order Delivered',
  body: 'Your order has been delivered successfully.',
  type: 'order',
  read: false,
  createdAt: '2026-01-01T00:00:00Z',
};

describe('NotificationItem', () => {
  it('renders title and body', () => {
    const { getByText } = render(<NotificationItem notification={notification} />, { wrapper });
    expect(getByText('Order Delivered')).toBeTruthy();
    expect(getByText('Your order has been delivered successfully.')).toBeTruthy();
  });
});
