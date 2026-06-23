import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { Toast } from './Toast';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('Toast', () => {
  it('renders message when visible', () => {
    const { getByText } = render(<Toast visible message="Success!" type="success" />, { wrapper });
    expect(getByText('Success!')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(<Toast visible={false} message="Hidden" />, { wrapper });
    expect(queryByText('Hidden')).toBeNull();
  });
});
