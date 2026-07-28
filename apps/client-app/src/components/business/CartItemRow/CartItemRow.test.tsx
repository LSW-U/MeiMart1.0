import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { CartItemRow } from './CartItemRow';
import type { CartItem } from '@/types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const item: CartItem = {
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
};

describe('CartItemRow', () => {
  it('renders product name, price, and quantity', () => {
    const { getByText } = render(<CartItemRow item={item} showControls={false} />, { wrapper });
    expect(getByText('Organic Wild Honey')).toBeTruthy();
    expect(getByText('$18.50')).toBeTruthy();
    expect(getByText('× 2')).toBeTruthy();
  });

  it('calls onQuantityChange when +/- pressed', () => {
    const onQuantityChange = jest.fn();
    const { getByLabelText } = render(
      <CartItemRow item={item} onQuantityChange={onQuantityChange} />,
      { wrapper },
    );
    fireEvent.press(getByLabelText('Increase quantity'));
    expect(onQuantityChange).toHaveBeenCalledWith(3);
    fireEvent.press(getByLabelText('Decrease quantity'));
    expect(onQuantityChange).toHaveBeenCalledWith(1);
  });

  it('reflects checkedOverride instead of item.selected when provided', () => {
    // §4.2 管理模式：item.selected=true 但 checkedOverride=false 应让 checkbox 显示未选
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <CartItemRow item={item} checkedOverride={false} onPress={onPress} />,
      { wrapper },
    );
    const checkbox = getByLabelText('Select item');
    expect(checkbox.props.accessibilityState?.checked).toBe(false);
    fireEvent.press(checkbox);
    expect(onPress).toHaveBeenCalledWith(item);
  });
});
