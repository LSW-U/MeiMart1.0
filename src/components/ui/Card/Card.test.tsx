import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { Card } from './Card';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('Card', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Card>
        <Text>Card content</Text>
      </Card>,
      { wrapper },
    );
    expect(getByText('Card content')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Card onPress={onPress} accessibilityLabel="card">
        <Text>Tap me</Text>
      </Card>,
      { wrapper },
    );
    fireEvent.press(getByText('Tap me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders as View when no onPress', () => {
    const { toJSON } = render(
      <Card>
        <Text>Static</Text>
      </Card>,
      { wrapper },
    );
    expect(toJSON()).toBeTruthy();
  });
});
