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

  // Why: P6 §2.3 角标 - badge 驱动，无值不渲染
  it('renders NEW badge when category.badge = new', () => {
    const { getByText, queryByText } = render(
      <CategoryItem category={{ ...category, badge: 'new' }} />,
      { wrapper },
    );
    expect(getByText('NEW')).toBeTruthy();
    expect(queryByText('HOT')).toBeNull();
  });

  it('renders HOT badge when category.badge = hot', () => {
    const { getByText } = render(
      <CategoryItem category={{ ...category, badge: 'hot' }} />,
      { wrapper },
    );
    expect(getByText('HOT')).toBeTruthy();
  });

  it('does not render badge when category.badge undefined', () => {
    const { queryByText } = render(<CategoryItem category={category} />, { wrapper });
    expect(queryByText('NEW')).toBeNull();
    expect(queryByText('HOT')).toBeNull();
  });
});
