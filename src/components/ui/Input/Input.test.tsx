import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { Input } from './Input';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('Input', () => {
  it('renders label and placeholder', () => {
    const { getByText, getByPlaceholderText } = render(
      <Input label="Email" placeholder="Enter email" />,
      { wrapper },
    );
    expect(getByText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Enter email')).toBeTruthy();
  });

  it('calls onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <Input placeholder="Search" onChangeText={onChangeText} />,
      { wrapper },
    );
    fireEvent.changeText(getByPlaceholderText('Search'), 'apple');
    expect(onChangeText).toHaveBeenCalledWith('apple');
  });

  it('shows error message when error is set', () => {
    const { getByText } = render(<Input label="Password" error="Password too short" />, {
      wrapper,
    });
    expect(getByText('Password too short')).toBeTruthy();
  });

  it('has a11y label', () => {
    const { getByLabelText } = render(<Input label="Username" />, { wrapper });
    expect(getByLabelText('Username')).toBeTruthy();
  });
});
