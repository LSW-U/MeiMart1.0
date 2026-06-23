import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { LogoBadge } from './LogoBadge';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('LogoBadge', () => {
  it('renders with default size', () => {
    const { toJSON } = render(<LogoBadge />, { wrapper });
    expect(toJSON()).not.toBeNull();
  });
});
