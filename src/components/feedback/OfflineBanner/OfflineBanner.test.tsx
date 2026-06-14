import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { OfflineBanner, WeakNetworkBanner } from './OfflineBanner';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('OfflineBanner', () => {
  it('renders offline message', () => {
    const { getByText } = render(<OfflineBanner />, { wrapper });
    expect(getByText(/You are offline/)).toBeTruthy();
  });

  it('calls onRetry when retry pressed', () => {
    const onRetry = jest.fn();
    const { getByText } = render(<OfflineBanner onRetry={onRetry} />, { wrapper });
    fireEvent.press(getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('WeakNetworkBanner', () => {
  it('renders weak network message', () => {
    const { getByText } = render(<WeakNetworkBanner />, { wrapper });
    expect(getByText(/Weak network/)).toBeTruthy();
  });
});
