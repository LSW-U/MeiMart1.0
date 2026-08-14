import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { CouponCard } from './CouponCard';
import type { ClientCoupon } from '@/services/promotion';

// Q1 修复：Min spend/Used/Use Now 改走 i18n，mock 返回 key（refunds.test 模式）
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: { amount?: number }) =>
    opts?.amount !== undefined ? `${key}:${opts.amount}` : key }),
}));

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
  it('renders discount label and name (ClientCoupon, 门槛文案带金额插值)', () => {
    const { getByText } = render(<CouponCard coupon={coupon} />, { wrapper });
    expect(getByText('10% OFF')).toBeTruthy();
    expect(getByText('New User Discount')).toBeTruthy();
    expect(getByText('coupons.minSpend:50')).toBeTruthy();
  });

  it('calls onUse when Use Now pressed (available)', () => {
    const onUse = jest.fn();
    const { getByText } = render(<CouponCard coupon={coupon} onUse={onUse} />, { wrapper });
    fireEvent.press(getByText('coupons.useNow'));
    expect(onUse).toHaveBeenCalledWith(coupon);
  });

  it('hides Use Now when status is used', () => {
    const usedCoupon: ClientCoupon = { ...coupon, status: 'used' };
    const onUse = jest.fn();
    const { queryByText } = render(<CouponCard coupon={usedCoupon} onUse={onUse} />, { wrapper });
    expect(queryByText('coupons.useNow')).toBeNull();
    expect(queryByText('coupons.used')).toBeTruthy();
  });
});
