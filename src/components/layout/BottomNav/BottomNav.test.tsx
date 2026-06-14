import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { BottomNav } from './BottomNav';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

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
