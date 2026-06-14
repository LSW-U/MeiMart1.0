import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { CategoryItem } from './CategoryItem';
import type { Category } from '@/types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const category: Category = { id: 'c1', name: 'Beverages', icon: 'coffee' };

describe('CategoryItem', () => {
  it('renders category name', () => {
    const { getByText } = render(<CategoryItem category={category} />, { wrapper });
    expect(getByText('Beverages')).toBeTruthy();
  });

  it('calls onPress with category', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<CategoryItem category={category} onPress={onPress} />, {
      wrapper,
    });
    fireEvent.press(getByLabelText('Category Beverages'));
    expect(onPress).toHaveBeenCalledWith(category);
  });
});
