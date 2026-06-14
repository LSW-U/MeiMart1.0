import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { UmaLulikSkyline } from './UmaLulikSkyline';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('UmaLulikSkyline', () => {
  it('renders with default height', () => {
    const { toJSON } = render(<UmaLulikSkyline />, { wrapper });
    expect(toJSON()).not.toBeNull();
  });
});
