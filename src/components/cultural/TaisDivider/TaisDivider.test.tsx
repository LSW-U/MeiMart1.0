import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { TaisDivider } from './TaisDivider';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('TaisDivider', () => {
  it('renders with default width', () => {
    const { toJSON } = render(<TaisDivider />, { wrapper });
    expect(toJSON()).not.toBeNull();
  });
});
