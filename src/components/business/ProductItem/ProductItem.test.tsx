import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { ProductItem } from './ProductItem';
import type { CartItem } from '@/types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const item: CartItem = {
  id: 'c1',
  product: {
    id: 'p1',
    name: 'Organic Wild Honey',
    price: 18.5,
    originalPrice: 22,
    image: 'https://example.com/h.jpg',
    category: 'food',
  },
  quantity: 2,
  selected: true,
};

describe('ProductItem', () => {
  it('renders name, price, and quantity', () => {
    const { getByText } = render(<ProductItem item={item} />, { wrapper });
    expect(getByText('Organic Wild Honey')).toBeTruthy();
    expect(getByText('$18.50')).toBeTruthy();
    expect(getByText('× 2')).toBeTruthy();
  });

  it('calls onPress with item', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<ProductItem item={item} onPress={onPress} />, {
      wrapper,
    });
    fireEvent.press(getByLabelText(/Organic Wild Honey/));
    expect(onPress).toHaveBeenCalledWith(item);
  });
});
