import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { ErrorState } from './ErrorState';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('ErrorState', () => {
  it('renders error message', () => {
    const { getByText } = render(<ErrorState message="Network error" />, { wrapper });
    expect(getByText('Network error')).toBeTruthy();
  });

  it('calls onRetry when retry pressed', () => {
    const onRetry = jest.fn();
    const { getByText } = render(<ErrorState message="Error" onRetry={onRetry} />, { wrapper });
    fireEvent.press(getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
