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

  // C-P2-1: 复用 utils/formatPrice 后千分位与 ISO 货币代码口径与 utils 一致
  it('formats thousands separator via shared formatPrice (C-P2-1)', () => {
    const { getByText } = render(<PriceText value={1234567.89} />, { wrapper });
    expect(getByText('$1,234,567.89')).toBeTruthy();
  });

  it('accepts ISO currency code (C-P2-1 unified with utils/format)', () => {
    const { getByText } = render(<PriceText value={12.5} currency="CNY" />, { wrapper });
    expect(getByText('¥12.50')).toBeTruthy();
  });
});
