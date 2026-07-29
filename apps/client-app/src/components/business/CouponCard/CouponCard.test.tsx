import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { CouponCard } from './CouponCard';
import type { ClientCoupon } from '@/services/promotion';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const coupon: ClientCoupon = {
  id: 'c1',
  code: 'NEWUSER',
  name: 'New User Discount',
  description: null,
  type: 'PERCENTAGE',
  value: 10,
  minOrderAmount: 50,
  maxDiscountAmount: null,
  startAt: '2026-01-01T00:00:00Z',
  endAt: '2027-12-31T23:59:59Z',
  status: 'available',
};

describe('CouponCard', () => {
  it('renders discount label and name (ClientCoupon)', () => {
    const { getByText } = render(<CouponCard coupon={coupon} />, { wrapper });
    expect(getByText('10% OFF')).toBeTruthy();
    expect(getByText('New User Discount')).toBeTruthy();
    expect(getByText('Min spend $50')).toBeTruthy();
  });

  it('calls onUse when Use Now pressed (available)', () => {
    const onUse = jest.fn();
    const { getByText } = render(<CouponCard coupon={coupon} onUse={onUse} />, { wrapper });
    fireEvent.press(getByText('Use Now'));
    expect(onUse).toHaveBeenCalledWith(coupon);
  });

  it('hides Use Now when status is used', () => {
    const usedCoupon: ClientCoupon = { ...coupon, status: 'used' };
    const onUse = jest.fn();
    const { queryByText } = render(<CouponCard coupon={usedCoupon} onUse={onUse} />, { wrapper });
    expect(queryByText('Use Now')).toBeNull();
    expect(queryByText('Used')).toBeTruthy();
  });
});
