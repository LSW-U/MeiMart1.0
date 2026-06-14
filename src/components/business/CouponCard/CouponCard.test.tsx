import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { CouponCard } from './CouponCard';
import type { Coupon } from '@/types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const coupon: Coupon = {
  id: 'c1',
  name: 'New User Discount',
  discount: 10,
  type: 'percentage',
  minPurchase: 50,
  validUntil: '2027-12-31',
  used: false,
};

describe('CouponCard', () => {
  it('renders discount label and name', () => {
    const { getByText } = render(<CouponCard coupon={coupon} />, { wrapper });
    expect(getByText('10% OFF')).toBeTruthy();
    expect(getByText('New User Discount')).toBeTruthy();
    expect(getByText('Min spend $50')).toBeTruthy();
  });

  it('calls onUse when Use Now pressed', () => {
    const onUse = jest.fn();
    const { getByText } = render(<CouponCard coupon={coupon} onUse={onUse} />, { wrapper });
    fireEvent.press(getByText('Use Now'));
    expect(onUse).toHaveBeenCalledWith(coupon);
  });
});
