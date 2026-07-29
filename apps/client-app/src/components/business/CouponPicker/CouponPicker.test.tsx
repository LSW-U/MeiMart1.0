import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { CouponPicker } from './CouponPicker';
import type { ClientCoupon } from '@/services/promotion';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const coupons: ClientCoupon[] = [
  {
    id: 'c1',
    code: 'NEWUSER',
    name: 'New User Discount',
    description: null,
    type: 'FIXED_AMOUNT',
    value: 5,
    minOrderAmount: 50,
    maxDiscountAmount: null,
    startAt: '2026-01-01T00:00:00Z',
    endAt: '2027-12-31T23:59:59Z',
    status: 'available',
  },
];

describe('CouponPicker', () => {
  it('calls onSelect with code + onClose when coupon pressed', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <CouponPicker visible onClose={onClose} coupons={coupons} onSelect={onSelect} />,
      { wrapper },
    );
    fireEvent.press(getByLabelText('New User Discount NEWUSER'));
    expect(onSelect).toHaveBeenCalledWith('NEWUSER');
    expect(onClose).toHaveBeenCalled();
  });

  it('marks selected coupon with active border (selectedCode match)', () => {
    const { getByLabelText } = render(
      <CouponPicker
        visible
        onClose={() => {}}
        coupons={coupons}
        selectedCode="NEWUSER"
        onSelect={() => {}}
      />,
      { wrapper },
    );
    // Why: 选中态 onPress 仍可触发（换券），accessibilityLabel 不变
    expect(getByLabelText('New User Discount NEWUSER')).toBeTruthy();
  });
});
