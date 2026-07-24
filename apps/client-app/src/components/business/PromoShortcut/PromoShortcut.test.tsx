import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { PromoShortcut } from './PromoShortcut';
import type { PromoShortcutItem } from './PromoShortcut.types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const items: PromoShortcutItem[] = [
  {
    id: 'deals',
    label: 'SAVE BIG',
    title: 'Deals',
    icon: 'local_offer',
    withCorner: true,
  },
  {
    id: 'new',
    label: 'WELCOME',
    title: 'New User',
    icon: 'person_add',
  },
];

describe('PromoShortcut', () => {
  it('renders label and title for each item', () => {
    const { getByText } = render(<PromoShortcut items={items} />, { wrapper });
    expect(getByText('SAVE BIG')).toBeTruthy();
    expect(getByText('Deals')).toBeTruthy();
    expect(getByText('WELCOME')).toBeTruthy();
    expect(getByText('New User')).toBeTruthy();
  });
});
