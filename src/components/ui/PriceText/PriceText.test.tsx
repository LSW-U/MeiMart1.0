import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { PriceText } from './PriceText';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('PriceText', () => {
  it('renders formatted current price', () => {
    const { getByText } = render(<PriceText value={18.5} />, { wrapper });
    expect(getByText('$18.50')).toBeTruthy();
  });

  it('renders original price with strikethrough when higher than current', () => {
    const { getByText } = render(<PriceText value={18.5} originalPrice={22} />, { wrapper });
    expect(getByText('$18.50')).toBeTruthy();
    const original = getByText('$22.00');
    expect(original.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ textDecorationLine: 'line-through' })]),
    );
  });

  it('does not render original price when lower than current', () => {
    const { queryByText } = render(<PriceText value={20} originalPrice={15} />, { wrapper });
    expect(queryByText('$15.00')).toBeNull();
  });

  it('supports custom currency symbol', () => {
    const { getByText } = render(<PriceText value={99} currency="¥" />, {
      wrapper,
    });
    expect(getByText('¥99.00')).toBeTruthy();
  });
});
