import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { HorizontalProductCard } from './HorizontalProductCard';
import type { Product } from '@/types';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const name = options?.name as string | undefined;
      if (key === 'product.viewItem') return `View ${name}`;
      if (key === 'product.addToCartLabel') return `Add ${name} to cart`;
      return key;
    },
  }),
}));

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
  rating: 4.5,
  salesCount: 120,
};

describe('HorizontalProductCard', () => {
  it('renders name + rating + calls handlers', () => {
    const onPress = jest.fn();
    const onAddToCart = jest.fn();
    const { getByLabelText, getByText } = render(
      <HorizontalProductCard
        product={product}
        onPress={onPress}
        onAddToCart={onAddToCart}
        showRating
      />,
      { wrapper },
    );
    fireEvent.press(getByLabelText('View Arabica Coffee'));
    expect(onPress).toHaveBeenCalled();
    fireEvent.press(getByLabelText('Add Arabica Coffee to cart'));
    expect(onAddToCart).toHaveBeenCalled();
    // Why: showRating 时显示评分 + 销量
    expect(getByText('4.5')).toBeTruthy();
  });

  it('hides rating when showRating=false', () => {
    const { queryByText } = render(
      <HorizontalProductCard
        product={product}
        onPress={() => {}}
        onAddToCart={() => {}}
      />,
      { wrapper },
    );
    expect(queryByText('4.5')).toBeNull();
  });
});
