import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/theme';
import { BottomNav } from './BottomNav';

jest.mock('@/services/queries/useCart', () => ({
  useCart: () => ({ data: { totalItems: 3 } }),
}));

// #1A 实测修复：label 改走 t('tabs.*')——mock 返 key（插值由 check-i18n-keys 四语对账保证），
// 断言渲染文案走 i18n 链路而非硬编码英文
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <ThemeProvider>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
};

describe('BottomNav', () => {
  it('renders all tabs via i18n keys', () => {
    const { getByLabelText } = render(<BottomNav activeTab="home" onTabPress={jest.fn()} />, {
      wrapper,
    });
    expect(getByLabelText('tabs.home')).toBeTruthy();
    expect(getByLabelText('tabs.categories')).toBeTruthy();
    expect(getByLabelText('tabs.cart')).toBeTruthy();
    expect(getByLabelText('tabs.orders')).toBeTruthy();
    expect(getByLabelText('tabs.account')).toBeTruthy();
  });

  it('calls onTabPress when tab pressed', () => {
    const onTabPress = jest.fn();
    const { getByLabelText } = render(<BottomNav activeTab="home" onTabPress={onTabPress} />, {
      wrapper,
    });
    fireEvent.press(getByLabelText('tabs.cart'));
    expect(onTabPress).toHaveBeenCalledWith('cart');
  });
});
