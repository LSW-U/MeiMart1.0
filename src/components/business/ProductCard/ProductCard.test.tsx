import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { ProductCard } from './ProductCard';
import type { Product } from '@/types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const product: Product = {
  id: 'p1',
  name: 'Organic Wild Honey',
  price: 18.5,
  originalPrice: 22,
  image: 'https://example.com/honey.jpg',
  category: 'food',
  rating: 4.5,
  salesCount: 120,
};

describe('ProductCard', () => {
  it('renders product name and price', () => {
    const { getByText } = render(<ProductCard product={product} />, { wrapper });
    expect(getByText('Organic Wild Honey')).toBeTruthy();
    expect(getByText('$18.50')).toBeTruthy();
  });

  it('renders strikethrough original price', () => {
    const { getByText } = render(<ProductCard product={product} />, { wrapper });
    expect(getByText('$22.00')).toBeTruthy();
  });

  it('calls onPress when card pressed', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<ProductCard product={product} onPress={onPress} />, {
      wrapper,
    });
    fireEvent.press(getByLabelText('Organic Wild Honey, price 18.5'));
    expect(onPress).toHaveBeenCalledWith(product);
  });

  it('calls onAddToCart when add-to-cart button pressed', () => {
    const onAddToCart = jest.fn();
    const { getByText } = render(<ProductCard product={product} onAddToCart={onAddToCart} />, {
      wrapper,
    });
    fireEvent.press(getByText('Add to Cart'));
    expect(onAddToCart).toHaveBeenCalledWith(product);
  });

  it('renders badge when provided', () => {
    const { getByText } = render(
      <ProductCard product={product} badge={{ label: 'Fresh', variant: 'fresh' }} />,
      { wrapper },
    );
    expect(getByText('Fresh')).toBeTruthy();
  });

  it('renders favorite button when showFavorite is true', () => {
    const { getByLabelText } = render(<ProductCard product={product} showFavorite />, { wrapper });
    expect(getByLabelText('Add to favorites')).toBeTruthy();
  });

  it('reflects favorite state', () => {
    const { getByLabelText } = render(<ProductCard product={product} showFavorite isFavorite />, {
      wrapper,
    });
    expect(getByLabelText('Remove from favorites')).toBeTruthy();
  });
});
