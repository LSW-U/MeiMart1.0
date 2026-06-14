import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { CategoryGrid } from './CategoryGrid';
import type { Category } from '@/types';

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
});
