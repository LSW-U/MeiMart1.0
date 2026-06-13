import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { Switch } from './Switch';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('Switch', () => {
  it('renders label', () => {
    const { getByText } = render(<Switch value={false} label="Notifications" />, { wrapper });
    expect(getByText('Notifications')).toBeTruthy();
  });

  it('calls onValueChange when pressed', () => {
    const onValueChange = jest.fn();
    const { getByRole } = render(<Switch value={false} onValueChange={onValueChange} />, {
      wrapper,
    });
    fireEvent.press(getByRole('switch'));
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('reflects value in a11y state', () => {
    const { getByRole } = render(<Switch value={true} />, { wrapper });
    expect(getByRole('switch').props.accessibilityState.checked).toBe(true);
  });
});
