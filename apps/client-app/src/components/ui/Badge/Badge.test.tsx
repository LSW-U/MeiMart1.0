import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { Badge } from './Badge';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('Badge', () => {
  it('renders number badge with count', () => {
    const { getByText, getByTestId } = render(<Badge count={5} />, { wrapper });
    expect(getByText('5')).toBeTruthy();
    expect(getByTestId('badge-number')).toBeTruthy();
  });

  it('renders dot variant', () => {
    const { getByTestId } = render(<Badge count={1} variant="dot" />, { wrapper });
    expect(getByTestId('badge-dot')).toBeTruthy();
  });

  it('shows maxCount+ when count exceeds maxCount', () => {
    const { getByText } = render(<Badge count={150} maxCount={99} />, { wrapper });
    expect(getByText('99+')).toBeTruthy();
  });

  it('renders null when count is 0', () => {
    const { toJSON } = render(<Badge count={0} />, { wrapper });
    expect(toJSON()).toBeNull();
  });
});
