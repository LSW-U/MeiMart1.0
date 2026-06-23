import React from 'react';
import { render } from '@testing-library/react-native';
import { Icon } from './Icon';

describe('Icon', () => {
  it('renders via symbol lookup (Material Symbols → MaterialCommunityIcons)', () => {
    const { toJSON } = render(<Icon symbol="shopping_cart" size={24} color="#000" />);
    expect(toJSON()).not.toBeNull();
  });

  it('renders via direct name (MaterialCommunityIcons)', () => {
    const { toJSON } = render(<Icon name="cart" size={24} color="#000" />);
    expect(toJSON()).not.toBeNull();
  });

  it('throws when neither symbol nor name is provided', () => {
    expect(() => render(<Icon />)).toThrow(/symbol.*name/);
  });

  it('falls back to a placeholder icon for unknown symbol names', () => {
    const { toJSON } = render(<Icon symbol="this_symbol_does_not_exist" />);
    expect(toJSON()).not.toBeNull();
  });

  it('applies testID when provided', () => {
    const { getByTestId } = render(<Icon symbol="search" testID="header-search-icon" />);
    expect(getByTestId('header-search-icon')).toBeTruthy();
  });
});
