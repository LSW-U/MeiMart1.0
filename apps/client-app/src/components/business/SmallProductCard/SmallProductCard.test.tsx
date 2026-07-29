import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { SmallProductCard } from './SmallProductCard';
import type { Product } from '@/types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const product: Product = {
  id: 'p1',
  name: { en: 'Arabica Coffee', zh: '咖啡', tet: 'Arabica Coffee' },
  price: 6.5,
  originalPrice: 8.0,
  image: 'https://example.com/coffee.jpg',
  category: 'beverages',
};

describe('SmallProductCard', () => {
  it('renders name + calls onPress/onAddToCart', () => {
    const onPress = jest.fn();
    const onAddToCart = jest.fn();
    const { getByLabelText } = render(
      <SmallProductCard product={product} onPress={onPress} onAddToCart={onAddToCart} />,
      { wrapper },
    );
    fireEvent.press(getByLabelText('View Arabica Coffee'));
    expect(onPress).toHaveBeenCalled();
    fireEvent.press(getByLabelText('Add Arabica Coffee to cart'));
    expect(onAddToCart).toHaveBeenCalled();
  });
});
