import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/theme';
import { BottomNav } from './BottomNav';

jest.mock('@/services/queries/useCart', () => ({
  useCart: () => ({ data: { totalItems: 3 } }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <ThemeProvider>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
};

describe('BottomNav', () => {
  it('renders all tabs', () => {
    const { getByLabelText } = render(<BottomNav activeTab="home" onTabPress={jest.fn()} />, {
      wrapper,
    });
    expect(getByLabelText('Home')).toBeTruthy();
    expect(getByLabelText('Categories')).toBeTruthy();
    expect(getByLabelText('Cart')).toBeTruthy();
    expect(getByLabelText('Orders')).toBeTruthy();
    expect(getByLabelText('Account')).toBeTruthy();
  });

  it('calls onTabPress when tab pressed', () => {
    const onTabPress = jest.fn();
    const { getByLabelText } = render(<BottomNav activeTab="home" onTabPress={onTabPress} />, {
      wrapper,
    });
    fireEvent.press(getByLabelText('Cart'));
    expect(onTabPress).toHaveBeenCalledWith('cart');
  });
});
