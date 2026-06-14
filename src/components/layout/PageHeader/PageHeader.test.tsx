import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { PageHeader } from './PageHeader';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('PageHeader', () => {
  it('renders title', () => {
    const { getByText } = render(<PageHeader title="Product Details" />, { wrapper });
    expect(getByText('Product Details')).toBeTruthy();
  });

  it('calls onBackPress when back button pressed', () => {
    const onBackPress = jest.fn();
    const { getByLabelText } = render(
      <PageHeader title="Details" showBack onBackPress={onBackPress} />,
      { wrapper },
    );
    fireEvent.press(getByLabelText('Go back'));
    expect(onBackPress).toHaveBeenCalledTimes(1);
  });

  it('renders right action', () => {
    const { getByText } = render(<PageHeader title="Cart" rightAction={<Text>Edit</Text>} />, {
      wrapper,
    });
    expect(getByText('Edit')).toBeTruthy();
  });
});
