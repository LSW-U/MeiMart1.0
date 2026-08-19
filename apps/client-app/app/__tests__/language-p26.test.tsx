/**
 * LanguagePage（app/language.tsx）渲染测试（P26，规则 8）
 *
 * 验证 P26 优化点：三语言项可见（tet 已启用）、选中态视觉标记、
 * 切换走 changeLocale + toast.success 反馈、版本号来自 appInfo。
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { toast } from '@/store/toastStore';
import { useAppStore } from '@/store/appStore';
import LanguagePage from '../language';

// expo-router：mock（select 后 setTimeout(handleBack) 不真导航）
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

// t 直返 key
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

// changeLocale mock（避免真切换 i18next 语言污染其他测试）
const mockChangeLocale = jest.fn((_code: string) => Promise.resolve());
jest.mock('@/i18n', () => ({
  ...jest.requireActual('@/i18n'),
  changeLocale: (code: string) => mockChangeLocale(code),
}));

// toast.success spy（断言切换反馈）
const toastSuccessSpy = jest.spyOn(toast, 'success').mockImplementation(() => {});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('LanguagePage（P26）', () => {
  beforeEach(() => {
    mockChangeLocale.mockClear();
    toastSuccessSpy.mockClear();
    useAppStore.setState({ locale: 'en' });
  });

  it('三语言项渲染（tet 已启用 D2）+ 说明条 + 版本底栏（D7/D8）', () => {
    const { getByText, getByTestId } = render(<LanguagePage />, { wrapper });
    expect(getByTestId('lang-zh')).toBeTruthy();
    expect(getByTestId('lang-en')).toBeTruthy();
    expect(getByTestId('lang-tet')).toBeTruthy(); // Q1=A：tet 可选
    expect(getByText('language.desc')).toBeTruthy();
    const appJson = jest.requireActual('../../app.json');
    // foot-note 是单 Text 含换行——用正则匹配两段内容
    expect(getByText(/MeiMart · language\.region/)).toBeTruthy();
    expect(getByText(new RegExp(`v${appJson.expo.version.replace(/\./g, '\\.')}`))).toBeTruthy();
  });

  it('选中项（en）有选中标记，点 zh 触发 changeLocale + toast（D3/D6）', async () => {
    const { getByTestId } = render(<LanguagePage />, { wrapper });
    // en 选中：a11y selected
    expect(getByTestId('lang-en').props.accessibilityState).toEqual({ selected: true });

    fireEvent.press(getByTestId('lang-zh'));
    await waitFor(() => {
      expect(mockChangeLocale).toHaveBeenCalledWith('zh');
      expect(toastSuccessSpy).toHaveBeenCalledWith('language.changed');
    });
    // changeLocale 是 mock，appStore locale 不变——调用链已验证即足够（切换后 selected 断言依赖真 changeLocale）
  });

  it('点当前语言不切换只返回（select 守卫）', () => {
    fireEvent.press(render(<LanguagePage />, { wrapper }).getByTestId('lang-en'));
    expect(mockChangeLocale).not.toHaveBeenCalled();
    expect(toastSuccessSpy).not.toHaveBeenCalled();
  });
});
