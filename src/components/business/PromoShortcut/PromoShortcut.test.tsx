import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { PromoShortcut } from './PromoShortcut';
import type { PromoShortcutItem } from './PromoShortcut.types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const items: PromoShortcutItem[] = [
  { id: 'p1', title: 'Flash Sale', icon: 'flash' },
  { id: 'p2', title: 'New', icon: 'new-box' },
  { id: 'p3', title: 'Coupons', icon: 'ticket-percent' },
];

describe('PromoShortcut', () => {
  it('renders all item titles', () => {
    const { getByText } = render(<PromoShortcut items={items} />, { wrapper });
    expect(getByText('Flash Sale')).toBeTruthy();
    expect(getByText('New')).toBeTruthy();
    expect(getByText('Coupons')).toBeTruthy();
  });
});
