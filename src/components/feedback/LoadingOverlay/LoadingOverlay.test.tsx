import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { LoadingOverlay } from './LoadingOverlay';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('LoadingOverlay', () => {
  it('renders message when visible', () => {
    const { getByText } = render(<LoadingOverlay visible message="Processing" />, { wrapper });
    expect(getByText('Processing')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(<LoadingOverlay visible={false} message="Hidden" />, {
      wrapper,
    });
    expect(queryByText('Hidden')).toBeNull();
  });
});
