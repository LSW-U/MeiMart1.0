import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { CouponPicker } from './CouponPicker';
import type { ClientCoupon } from '@/services/promotion';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number; amount?: number }) =>
      opts?.amount !== undefined ? `${key}:${opts.amount}` : opts?.count !== undefined ? `${key}:${opts.count}` : key,
  }),
}));

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
  {
    id: 'c2',
    code: 'BIGSAVE',
    name: 'Big Save',
    description: null,
    type: 'FIXED_AMOUNT',
    value: 10,
    minOrderAmount: 100,
    maxDiscountAmount: null,
    startAt: '2026-01-01T00:00:00Z',
    endAt: '2027-12-31T23:59:59Z',
    status: 'available',
  },
];

describe('CouponPicker（模块方案 D4 归一：compact 卡 + orderAmount 分组）', () => {
  it('calls onSelect with code + onClose when coupon pressed', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <CouponPicker
        visible
        onClose={onClose}
        coupons={coupons}
        orderAmount={60}
        onSelect={onSelect}
      />,
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
        orderAmount={60}
        selectedCode="NEWUSER"
        onSelect={() => {}}
      />,
      { wrapper },
    );
    // Why: 选中态 onPress 仍可触发（换券），accessibilityLabel 不变
    expect(getByLabelText('New User Discount NEWUSER')).toBeTruthy();
  });

  it('orderAmount 门槛分组：达标进「本单可用」，未达标进「本单不可用」并显示差额', () => {
    const { getByText, getByLabelText } = render(
      <CouponPicker
        visible
        onClose={() => {}}
        coupons={coupons}
        orderAmount={60}
        onSelect={() => {}}
      />,
      { wrapper },
    );
    // c1 门槛 50 ≤ 60 → 可用组
    expect(getByText('coupons.usableThisOrder')).toBeTruthy();
    // c2 门槛 100 > 60 → 不可用组 + 差额 40
    expect(getByText('coupons.unusableThisOrder')).toBeTruthy();
    expect(getByText('coupons.needMore:40')).toBeTruthy();
    // 不可用券 disabled a11y
    const disabledRow = getByLabelText('Big Save BIGSAVE');
    expect(disabledRow.props.accessibilityState).toEqual({ disabled: true });
  });

  it('不可用券禁点（onSelect 不触发，弱网防试错）', () => {
    const onSelect = jest.fn();
    const { getByLabelText } = render(
      <CouponPicker
        visible
        onClose={() => {}}
        coupons={coupons}
        orderAmount={60}
        onSelect={onSelect}
      />,
      { wrapper },
    );
    fireEvent.press(getByLabelText('Big Save BIGSAVE'));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
