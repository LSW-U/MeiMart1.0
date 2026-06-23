import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { KeyboardAvoidingWrapper } from './KeyboardAvoidingView';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('KeyboardAvoidingWrapper', () => {
  it('renders children', () => {
    const { getByText } = render(
      <KeyboardAvoidingWrapper>
        <Text>Form</Text>
      </KeyboardAvoidingWrapper>,
      { wrapper },
    );
    expect(getByText('Form')).toBeTruthy();
  });
});
