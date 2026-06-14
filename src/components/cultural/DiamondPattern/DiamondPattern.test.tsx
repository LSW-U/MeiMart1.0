import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { DiamondPattern } from './DiamondPattern';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('DiamondPattern', () => {
  it('renders with default size', () => {
    const { toJSON } = render(<DiamondPattern />, { wrapper });
    expect(toJSON()).not.toBeNull();
  });
});
