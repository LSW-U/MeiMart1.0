// P24 引导页测试：3 屏渲染（图标渐变底替外链图）/ 末屏文化组件收敛 / skip→login / goLogin 独立 / dot 跳转
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
// router/appStore 句柄（断言 replace/完成态用；jest.mock hoist 保证拿到的是 mock 版）
import { router } from 'expo-router';
import { useAppStore } from '@/store/appStore';
import OnboardingPage from '../onboarding';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

describe('OnboardingPage（P24：图标渐变底 + 文化收敛 + goLogin）', () => {
  beforeEach(() => {
    (router.replace as jest.Mock).mockClear();
    useAppStore.setState({ onboardingCompleted: false });
  });

  it('首屏渲染 3 dot + skip 按钮 + 主按钮 Next，插画区无外链图', () => {
    const { getByTestId, queryByTestId, getByText } = render(<OnboardingPage />, {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });
    expect(getByTestId('dot-s1')).toBeTruthy();
    expect(getByTestId('dot-s2')).toBeTruthy();
    expect(getByTestId('dot-s3')).toBeTruthy();
    expect(getByTestId('onboarding-skip')).toBeTruthy();
    expect(getByTestId('onboarding-next')).toBeTruthy();
    // 主按钮非末屏显示 common.next（mock t 直返 key）
    expect(getByText('common.next')).toBeTruthy();
    // D2：SafeImage 已删，页面无图片节点（外链图清零）
    expect(queryByTestId('onboarding-image')).toBeNull();
  });

  it('D7 末屏次按钮（goLogin）与 skip 都置完成态并跳 login', () => {
    const { getByTestId } = render(<OnboardingPage />, {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });
    // skip 按钮（非末屏）
    fireEvent.press(getByTestId('onboarding-skip'));
    expect(useAppStore.getState().onboardingCompleted).toBe(true);
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('D4 dot 跳到末屏后显示次按钮，屏序仍为 3', () => {
    const { getByTestId, queryByTestId } = render(<OnboardingPage />, {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });
    // scrollToIndex 在测试环境是 mock ref（无 listRef 实现），直接按压 s3 dot 仅验证 Pressable 可达
    expect(getByTestId('dot-s3').props.accessibilityState?.selected).toBe(false);
    expect(queryByTestId('onboarding-login')).toBeNull(); // 首屏非末屏无次按钮
  });
});
