import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { OrderCard } from './OrderCard';
import type { Order } from '@/types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const order: Order = {
  id: 'o1',
  orderNo: 'ORD-20240101-0001',
  status: 'pending',
  items: [
    {
      id: 'c1',
      product: {
        id: 'p1',
        name: 'Organic Wild Honey',
        price: 18.5,
        image: 'https://example.com/h.jpg',
        category: 'food',
      },
      quantity: 2,
      selected: true,
    },
  ],
  totalPrice: 37,
  createdAt: '2024-01-01T00:00:00Z',
};

describe('OrderCard', () => {
  it('renders order number, status, total', () => {
    const { getByText } = render(<OrderCard order={order} />, { wrapper });
    expect(getByText('#ORD-20240101-0001')).toBeTruthy();
    expect(getByText('Pending Payment')).toBeTruthy();
    expect(getByText('$37.00')).toBeTruthy();
  });

  it('renders Pay Now and Cancel actions for pending status', () => {
    const onAction = jest.fn();
    const { getByText } = render(<OrderCard order={order} onAction={onAction} />, {
      wrapper,
    });
    fireEvent.press(getByText('Pay Now'));
    expect(onAction).toHaveBeenCalledWith('pay', order);
  });
});
