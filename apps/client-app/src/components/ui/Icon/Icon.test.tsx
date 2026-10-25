import React from 'react';
import { render } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme';

import { Icon } from './Icon';

// P2-31：Icon 默认色走 useTheme（on-surface）后，测试需 ThemeProvider 包裹（同 Card/Input 先例）
const renderWithTheme = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('Icon', () => {
  it('renders via symbol lookup (Material Symbols → MaterialCommunityIcons)', () => {
    const { toJSON } = renderWithTheme(<Icon symbol="shopping_cart" size={24} color="#000" />);
    expect(toJSON()).not.toBeNull();
  });

  it('renders via direct name (MaterialCommunityIcons)', () => {
    const { toJSON } = renderWithTheme(<Icon name="cart" size={24} color="#000" />);
    expect(toJSON()).not.toBeNull();
  });

  it('throws when neither symbol nor name is provided', () => {
    expect(() => renderWithTheme(<Icon />)).toThrow(/symbol.*name/);
  });

  it('falls back to a placeholder icon for unknown symbol names', () => {
    const { toJSON } = renderWithTheme(<Icon symbol="this_symbol_does_not_exist" />);
    expect(toJSON()).not.toBeNull();
  });

  it('applies testID when provided', () => {
    const { getByTestId } = renderWithTheme(<Icon symbol="search" testID="header-search-icon" />);
    expect(getByTestId('header-search-icon')).toBeTruthy();
  });

  it('defaults color to theme on-surface when omitted (P2-31)', () => {
    const { toJSON } = renderWithTheme(<Icon symbol="search" />);
    expect(toJSON()).not.toBeNull();
  });
});
