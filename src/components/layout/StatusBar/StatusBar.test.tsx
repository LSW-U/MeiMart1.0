import React from 'react';
import { StatusBar } from 'react-native';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { StatusBarConfig } from './StatusBar';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('StatusBarConfig', () => {
  it('renders without crashing', () => {
    const { UNSAFE_getByType } = render(<StatusBarConfig />, { wrapper });
    expect(UNSAFE_getByType(StatusBar)).toBeTruthy();
  });
});
