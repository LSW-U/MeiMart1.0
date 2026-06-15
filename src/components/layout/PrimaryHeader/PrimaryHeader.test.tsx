import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { PrimaryHeader } from './PrimaryHeader';
import { Icon } from '@/components/ui/Icon';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('PrimaryHeader', () => {
  it('renders title', () => {
    const { getByText } = render(<PrimaryHeader title="My Orders" />, { wrapper });
    expect(getByText('My Orders')).toBeTruthy();
  });

  it('shows back button when showBack is true', () => {
    const onBackPress = jest.fn();
    const { getByLabelText } = render(
      <PrimaryHeader title="Search" showBack onBackPress={onBackPress} />,
      { wrapper },
    );
    fireEvent.press(getByLabelText('Go back'));
    expect(onBackPress).toHaveBeenCalled();
  });

  it('shows location chip when showLocation is true', () => {
    const { getByLabelText } = render(
      <PrimaryHeader title="Home" showLocation locationLabel="Dili, Christo Rei" />,
      { wrapper },
    );
    expect(getByLabelText('Location: Dili, Christo Rei')).toBeTruthy();
  });

  it('renders right actions', () => {
    const { getByLabelText } = render(
      <PrimaryHeader
        title="Home"
        rightActions={<Icon symbol="shopping_cart" testID="header-cart" />}
      />,
      { wrapper },
    );
    // Icon with testID is rendered inside rightActions
    expect(getByLabelText('shopping_cart')).toBeTruthy();
  });
});
