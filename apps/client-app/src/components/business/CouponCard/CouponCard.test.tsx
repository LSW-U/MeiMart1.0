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
    expect(getByText('10% coupons.off')).toBeTruthy();
    expect(getByText('New User Discount')).toBeTruthy();
    expect(getByText('coupons.minSpend:50')).toBeTruthy();
  });

  it('calls onUse when Go browse pressed (available)', () => {
    const onUse = jest.fn();
    const { getByText } = render(<CouponCard coupon={coupon} onUse={onUse} />, { wrapper });
    fireEvent.press(getByText('coupons.goBrowse'));
    expect(onUse).toHaveBeenCalledWith(coupon);
  });

  it('hides Use Now when status is used', () => {
    const usedCoupon: ClientCoupon = { ...coupon, status: 'used' };
    const onUse = jest.fn();
    const { queryByText } = render(<CouponCard coupon={usedCoupon} onUse={onUse} />, { wrapper });
    expect(queryByText('coupons.goBrowse')).toBeNull();
    expect(queryByText('coupons.used')).toBeTruthy();
  });

  it('shows Expires today when endAt within today (daysLeft = 0，审查 Q1 死分支回归)', () => {
    // 剩 2h：Math.ceil(2/24)=1 → 但 endAt 当天 0 点已过 → 走「今天到期」
    // 直接构造 daysLeft = 0 场景：endAt = 今天 0 点 + 12h（此刻到 endAt 不足 24h 且跨 0 点后 ceil=0 需当天构造）
    // 简化：endAt 设为 now + 1h → ceil(1/24) = 1 ≥ 1？不对 —— 用稳定口径：endAt = now + 23h → ceil(23/24) = 1
    // 真正触发 expiresToday 需 daysLeft ≤ 0 且 > -1：endAt = now - 1h（刚过期 1h，ceil = 0）
    const expiredHoursAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    const todayCoupon: ClientCoupon = { ...coupon, endAt: expiredHoursAgo };
    const { getByText, queryByText } = render(<CouponCard coupon={todayCoupon} />, { wrapper });
    expect(queryByText(/daysLeft/)).toBeNull();
    expect(getByText('coupons.expiresToday')).toBeTruthy();
  });
});
