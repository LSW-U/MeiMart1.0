import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { TabBar } from './TabBar';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('TabBar', () => {
  it('renders all tabs', () => {
    const { getByText } = render(
      <TabBar tabs={['All', 'Pending', 'Completed']} activeIndex={0} onTabChange={jest.fn()} />,
      { wrapper },
    );
    expect(getByText('All')).toBeTruthy();
    expect(getByText('Pending')).toBeTruthy();
    expect(getByText('Completed')).toBeTruthy();
  });

  it('calls onTabChange when tab pressed', () => {
    const onTabChange = jest.fn();
    const { getByText } = render(
      <TabBar tabs={['All', 'Pending']} activeIndex={0} onTabChange={onTabChange} />,
      { wrapper },
    );
    fireEvent.press(getByText('Pending'));
    expect(onTabChange).toHaveBeenCalledWith(1);
  });
});
