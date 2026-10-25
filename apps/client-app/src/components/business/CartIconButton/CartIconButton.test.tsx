import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme';

import { CartIconButton } from './CartIconButton';

// useTheme 组件需 ThemeProvider 包裹（同 Card/Input/PriceText 测试先例）
const renderWithTheme = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('CartIconButton', () => {
  it('renders with a11y label', () => {
    const { getByLabelText } = renderWithTheme(
      <CartIconButton
        count={0}
        iconColor="#000000"
        onPress={() => {}}
        accessibilityLabel="3 items in cart"
      />,
    );
    expect(getByLabelText('3 items in cart')).toBeTruthy();
  });

  it('hides badge when count is 0', () => {
    const { queryByTestId } = renderWithTheme(
      <CartIconButton count={0} iconColor="#000000" onPress={() => {}} accessibilityLabel="cart" />,
    );
    expect(queryByTestId('badge-number')).toBeNull();
  });

  it('shows count badge clamped at 99+', () => {
    const { getByText } = renderWithTheme(
      <CartIconButton
        count={120}
        iconColor="#000000"
        onPress={() => {}}
        accessibilityLabel="cart"
      />,
    );
    expect(getByText('99+')).toBeTruthy();
  });

  it('fires onPress', () => {
    const onPress = jest.fn();
    const { getByLabelText } = renderWithTheme(
      <CartIconButton count={1} iconColor="#000000" onPress={onPress} accessibilityLabel="cart" />,
    );
    fireEvent(getByLabelText('cart'), 'press');
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
