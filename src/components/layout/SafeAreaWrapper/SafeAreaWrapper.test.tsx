import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { SafeAreaWrapper } from './SafeAreaWrapper';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('SafeAreaWrapper', () => {
  it('renders children', () => {
    const { getByText } = render(
      <SafeAreaWrapper>
        <Text>Hello</Text>
      </SafeAreaWrapper>,
      { wrapper },
    );
    expect(getByText('Hello')).toBeTruthy();
  });
});
