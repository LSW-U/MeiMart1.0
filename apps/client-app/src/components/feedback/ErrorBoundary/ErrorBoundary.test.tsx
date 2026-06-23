import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { ErrorBoundary } from './ErrorBoundary';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const ThrowError = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Text>Safe content</Text>
      </ErrorBoundary>,
      { wrapper },
    );
    expect(getByText('Safe content')).toBeTruthy();
  });

  it('renders fallback on error', () => {
    const { getByText } = render(
      <ErrorBoundary fallback={<Text>Fallback</Text>}>
        <ThrowError />
      </ErrorBoundary>,
      { wrapper },
    );
    expect(getByText('Fallback')).toBeTruthy();
  });
});
