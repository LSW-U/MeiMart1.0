/**
 * LegalPage（app/legal/[type].tsx）渲染测试（P17 决策 4，规则 8）
 *
 * mock expo-router 的 useLocalSearchParams 控制 type 参数。
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import LegalPage from '../legal/[type]';

let mockType: string | undefined = 'terms';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ type: mockType }),
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('LegalPage', () => {
  it('type=terms 显示用户协议标题 + 待法务占位', () => {
    mockType = 'terms';
    const { getByText, getAllByText } = render(<LegalPage />, { wrapper });
    expect(getAllByText('legal.terms.title').length).toBeGreaterThanOrEqual(1);
    expect(getByText('legal.comingSoon')).toBeTruthy();
  });

  it('type=privacy 显示隐私政策标题', () => {
    mockType = 'privacy';
    const { getAllByText } = render(<LegalPage />, { wrapper });
    expect(getAllByText('legal.privacy.title').length).toBeGreaterThanOrEqual(1);
  });

  it('非法 type 显示 not found 空态（路由参数校验）', () => {
    mockType = 'evil-injection';
    const { getByText, queryByText } = render(<LegalPage />, { wrapper });
    expect(getByText('errors.notFoundTitle')).toBeTruthy();
    expect(queryByText('legal.comingSoon')).toBeNull();
  });
});
