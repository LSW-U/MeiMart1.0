import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { DecorativeCorner } from './DecorativeCorner';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('DecorativeCorner', () => {
  it('renders with default light variant', () => {
    const { toJSON } = render(<DecorativeCorner size={120} />, { wrapper });
    expect(toJSON()).not.toBeNull();
  });

  it('renders with primary variant', () => {
    const { toJSON } = render(<DecorativeCorner size={80} variant="primary" />, { wrapper });
    expect(toJSON()).not.toBeNull();
  });
});
