import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { OfflineBanner, WeakNetworkBanner } from './OfflineBanner';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('OfflineBanner', () => {
  it('renders offline message (t() 链路，key 直通断言)', () => {
    const { getByText } = render(<OfflineBanner />, { wrapper });
    expect(getByText('common.youAreOffline')).toBeTruthy();
  });

  it('calls onRetry when retry pressed', () => {
    const onRetry = jest.fn();
    const { getByText } = render(<OfflineBanner onRetry={onRetry} />, { wrapper });
    fireEvent.press(getByText('common.retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('WeakNetworkBanner', () => {
  it('renders weak network message', () => {
    const { getByText } = render(<WeakNetworkBanner />, { wrapper });
    expect(getByText('common.weakNetwork')).toBeTruthy();
  });
});
