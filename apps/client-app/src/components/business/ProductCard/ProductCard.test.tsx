import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { ProductCard } from './ProductCard';
import type { Product } from '@/types';

// P19 D8 收口后 sold/Add to Cart 走 i18n，mock 返回 key（refunds.test 模式）
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { name?: string }) =>
      opts?.name !== undefined ? `${key}:${opts.name}` : key,
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const product: Product = {
  id: 'p1',
  name: { zh: '有机野蜂蜜', en: 'Organic Wild Honey', tet: 'Fuan Mensak' },
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
    // Q6 修复：a11y label 价格走 formatPrice（与视觉 PriceText 一致，$18.50 而非 18.5）
    fireEvent.press(getByLabelText('Organic Wild Honey, price $18.50'));
    expect(onPress).toHaveBeenCalledWith(product);
  });

  it('calls onAddToCart when add-to-cart button pressed', () => {
    const onAddToCart = jest.fn();
    const { getByText } = render(<ProductCard product={product} onAddToCart={onAddToCart} />, {
      wrapper,
    });
    fireEvent.press(getByText('product.addToCart'));
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
    expect(getByLabelText('product.addToFavorites')).toBeTruthy();
  });

  it('reflects favorite state', () => {
    const { getByLabelText } = render(<ProductCard product={product} showFavorite isFavorite />, {
      wrapper,
    });
    expect(getByLabelText('product.removeFromFavorites')).toBeTruthy();
  });
});
