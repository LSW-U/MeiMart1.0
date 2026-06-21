import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { OrderPriceSummaryCard } from './OrderPriceSummaryCard';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('OrderPriceSummaryCard', () => {
  it('renders subtotal, shipping, discount and total', () => {
    const { getByText } = render(
      <OrderPriceSummaryCard subtotal={37} shipping={2} discount={5} total={34} />,
      { wrapper },
    );
    expect(getByText('$37.00')).toBeTruthy();
    expect(getByText('$2.00')).toBeTruthy();
    expect(getByText('-$5.00')).toBeTruthy();
    expect(getByText('$34.00')).toBeTruthy();
  });

  it('hides discount row when discount is undefined', () => {
    const { queryByText } = render(
      <OrderPriceSummaryCard subtotal={37} shipping={2} total={39} />,
      { wrapper },
    );
    expect(queryByText(/Discount/)).toBeNull();
  });
});
