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
    id: 'p1',
    label: 'SAVE BIG',
    title: 'Deals',
    icon: 'local_offer',
    bgColor: 'rgba(150,24,19,0.05)',
    borderColor: 'rgba(150,24,19,0.2)',
    labelColor: '#961813',
    titleColor: '#961813',
    iconColor: '#961813',
    withCorner: true,
  },
  {
    id: 'p2',
    label: 'WELCOME',
    title: 'New User',
    icon: 'person_add',
    bgColor: '#ecfdf5',
    borderColor: '#d1fae5',
    labelColor: '#047857',
    titleColor: '#047857',
    iconColor: '#059669',
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
