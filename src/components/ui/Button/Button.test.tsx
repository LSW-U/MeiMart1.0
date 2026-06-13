import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { Button } from './Button';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('Button', () => {
  it('renders label correctly', () => {
    const { getByText } = render(<Button label="Submit" />, { wrapper });
    expect(getByText('Submit')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Click" onPress={onPress} />, {
      wrapper,
    });
    fireEvent.press(getByText('Click'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Click" disabled onPress={onPress} />, {
      wrapper,
    });
    fireEvent.press(getByText('Click'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Click" loading onPress={onPress} />, {
      wrapper,
    });
    fireEvent.press(getByText('Click'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('has accessibility role button', () => {
    const { getByRole } = render(<Button label="Submit" />, { wrapper });
    expect(getByRole('button')).toBeTruthy();
  });
});
