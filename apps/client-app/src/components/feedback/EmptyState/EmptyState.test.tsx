import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { EmptyState } from './EmptyState';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('EmptyState', () => {
  it('renders title and description', () => {
    const { getByText } = render(<EmptyState title="No items" description="Your cart is empty" />, {
      wrapper,
    });
    expect(getByText('No items')).toBeTruthy();
    expect(getByText('Your cart is empty')).toBeTruthy();
  });

  it('calls onAction when action pressed', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <EmptyState title="Empty" actionLabel="Shop now" onAction={onAction} />,
      { wrapper },
    );
    fireEvent.press(getByText('Shop now'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
