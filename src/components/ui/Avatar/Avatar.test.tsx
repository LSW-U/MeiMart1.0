import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { Avatar } from './Avatar';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('Avatar', () => {
  it('renders fallback initials when no uri', () => {
    const { getByText } = render(<Avatar fallback="AB" />, { wrapper });
    expect(getByText('AB')).toBeTruthy();
  });

  it('truncates fallback to 2 chars uppercase', () => {
    const { getByText } = render(<Avatar fallback="john doe" />, { wrapper });
    expect(getByText('JO')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<Avatar onPress={onPress} fallback="AB" />, { wrapper });
    fireEvent.press(getByRole('imagebutton'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders edit badge when editable', () => {
    const { getByTestId } = render(<Avatar editable fallback="AB" />, { wrapper });
    // editable badge contains a Text mock (since icons are mocked as Text)
    const badge = getByTestId('icon-pencil');
    expect(badge).toBeTruthy();
  });
});
