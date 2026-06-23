import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { Logo } from './Logo';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('Logo', () => {
  it('renders SVG without text by default', () => {
    const { toJSON, queryByText } = render(<Logo size={32} />, { wrapper });
    expect(toJSON()).not.toBeNull();
    expect(queryByText('Mei mart')).toBeNull();
  });

  it('renders brand text when withText is true', () => {
    const { getByText } = render(<Logo size={32} withText />, { wrapper });
    expect(getByText('Mei mart')).toBeTruthy();
  });
});
