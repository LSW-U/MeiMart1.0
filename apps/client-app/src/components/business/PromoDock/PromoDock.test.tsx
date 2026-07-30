import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { PromoDock } from './PromoDock';
import type { Promotion } from '@/services/promotion';

// Why: PromoDock 用 useTranslation，mock t(titleKey) -> titleKey 原样 + empty 文案
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const promotions: Promotion[] = [
  {
    id: 'flash',
    titleKey: 'promotion.flashDeals',
    icon: 'bolt',
    theme: 'deals',
    link: '/product/list?promotion=flash',
    sortOrder: 1,
  },
  {
    id: 'coupons',
    titleKey: 'promotion.coupons',
    icon: 'confirmation_number',
    theme: 'coupons',
    link: '/coupons',
    sortOrder: 2,
  },
];

describe('PromoDock', () => {
  it('renders all promotion titles', () => {
    const { getByText } = render(<PromoDock promotions={promotions} />, { wrapper });
    expect(getByText('promotion.flashDeals')).toBeTruthy();
    expect(getByText('promotion.coupons')).toBeTruthy();
  });

  it('calls onPress with promotion', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<PromoDock promotions={promotions} onPress={onPress} />, {
      wrapper,
    });
    fireEvent.press(getByLabelText('promotion.flashDeals'));
    expect(onPress).toHaveBeenCalledWith(promotions[0]);
  });

  // Why: §2.7 空态 - 无活动时不隐藏，显示虚线框 + empty 文案
  it('renders empty placeholder when promotions empty', () => {
    const { getByText, queryByLabelText } = render(<PromoDock promotions={[]} />, { wrapper });
    expect(getByText('promotion.empty')).toBeTruthy();
    expect(queryByLabelText('promotion.flashDeals')).toBeNull();
  });
});
