import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { TaisPattern } from './TaisPattern';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('TaisPattern', () => {
  it('renders with default size', () => {
    const { toJSON } = render(<TaisPattern />, { wrapper });
    expect(toJSON()).not.toBeNull();
  });
});
