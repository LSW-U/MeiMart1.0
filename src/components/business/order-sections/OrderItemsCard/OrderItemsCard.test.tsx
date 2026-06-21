import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { OrderItemsCard } from './OrderItemsCard';
import type { CartItem } from '@/types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const items: CartItem[] = [
  {
    id: 'c1',
    product: {
      id: 'p1',
      name: { zh: '有机野蜂蜜', en: 'Organic Wild Honey', tet: 'Fuan Mensak' },
      price: 18.5,
      image: 'https://example.com/h.jpg',
      category: 'food',
    },
    quantity: 2,
    selected: true,
  },
];

describe('OrderItemsCard', () => {
  it('renders product name, unit price and quantity', () => {
    const { getByText } = render(<OrderItemsCard items={items} />, { wrapper });
    expect(getByText('Organic Wild Honey')).toBeTruthy();
    expect(getByText('$18.50 × 2')).toBeTruthy();
  });

  it('calls onItemPress when row tapped', () => {
    const onItemPress = jest.fn();
    const { getByLabelText } = render(<OrderItemsCard items={items} onItemPress={onItemPress} />, {
      wrapper,
    });
    fireEvent.press(getByLabelText(/View product: Organic Wild Honey/));
    expect(onItemPress).toHaveBeenCalledWith(items[0]);
  });
});
