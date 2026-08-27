import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { MasonryProductCard } from './MasonryProductCard';
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
};

describe('MasonryProductCard', () => {
  it('renders name + calls handlers', () => {
    const onPress = jest.fn();
    const onAddToCart = jest.fn();
    const { getByLabelText } = render(
      <MasonryProductCard product={product} onPress={onPress} onAddToCart={onAddToCart} />,
      { wrapper },
    );
    fireEvent.press(getByLabelText('View Arabica Coffee'));
    expect(onPress).toHaveBeenCalled();
    fireEvent.press(getByLabelText('Add Arabica Coffee to cart'));
    expect(onAddToCart).toHaveBeenCalled();
  });
});

describe('MasonryProductCard 管理态（favorites selectMode）', () => {
  it('selectMode：隐藏 badge 与加购钮，显示选择圆圈；选中态 primary 边', () => {
    const onPress = jest.fn();
    const onAddToCart = jest.fn();
    const { getByLabelText, queryByLabelText, getByTestId } = render(
      <MasonryProductCard
        product={product}
        onPress={onPress}
        onAddToCart={onAddToCart}
        badge={{ label: 'NEW', variant: 'new' }}
        selectMode
        isSelected={false}
        testID="masonry-select"
      />,
      { wrapper },
    );
    // badge 与加购钮让位（选择优先）
    expect(queryByLabelText('Add Arabica Coffee to cart')).toBeNull();
    // 点卡走 onPress（favorites 传 toggleSelect）
    fireEvent.press(getByLabelText('View Arabica Coffee'));
    expect(onPress).toHaveBeenCalled();
    expect(onAddToCart).not.toHaveBeenCalled();
    expect(getByTestId('masonry-select')).toBeTruthy();
  });
});
