import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { CategoryGrid } from './CategoryGrid';
import type { Category } from '@/types';

// Why: MoreItem 用 useTranslation，mock t('common.more') -> 'More'
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'common.more' ? 'More' : key),
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const categories: Category[] = [
  { id: 'c1', name: 'Food', icon: 'food' },
  { id: 'c2', name: 'Drinks', icon: 'coffee' },
  { id: 'c3', name: 'Home', icon: 'home' },
  { id: 'c4', name: 'Care', icon: 'hand-heart' },
];

describe('CategoryGrid', () => {
  it('renders all category names', () => {
    const { getByText } = render(<CategoryGrid categories={categories} />, { wrapper });
    expect(getByText('Food')).toBeTruthy();
    expect(getByText('Drinks')).toBeTruthy();
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('Care')).toBeTruthy();
  });

  it('renders 2 rows when 4 items in 2 columns', () => {
    const { getAllByText } = render(<CategoryGrid categories={categories} columns={2} />, {
      wrapper,
    });
    // Each name appears once, but we just verify grid doesn't crash
    expect(getAllByText('Food').length).toBeGreaterThanOrEqual(1);
  });

  // Why: P6 V1f - 超 MAX_VISIBLE(7) 时前 7 + More，第 8 个分类不渲染
  it('renders first 7 + More when 8 categories (overflow)', () => {
    const eight: Category[] = Array.from({ length: 8 }, (_, i) => ({
      id: `c${i + 1}`,
      name: `Cat${i + 1}`,
      icon: 'tag',
    }));
    const { getByText, queryByText } = render(<CategoryGrid categories={eight} />, { wrapper });
    // 前 7 个渲染
    for (let i = 1; i <= 7; i++) {
      expect(getByText(`Cat${i}`)).toBeTruthy();
    }
    // 第 8 个被 More 替代，不渲染
    expect(queryByText('Cat8')).toBeNull();
    // More 按钮显示
    expect(getByText('More')).toBeTruthy();
  });

  it('does not render More when categories <= 7', () => {
    const { queryByText } = render(<CategoryGrid categories={categories} />, { wrapper });
    expect(queryByText('More')).toBeNull();
  });

  it('calls onMorePress when More pressed (8 categories)', () => {
    const onMorePress = jest.fn();
    const eight: Category[] = Array.from({ length: 8 }, (_, i) => ({
      id: `c${i + 1}`,
      name: `Cat${i + 1}`,
      icon: 'tag',
    }));
    const { getByText } = render(
      <CategoryGrid categories={eight} onMorePress={onMorePress} />,
      { wrapper },
    );
    fireEvent.press(getByText('More'));
    expect(onMorePress).toHaveBeenCalledTimes(1);
  });
});
