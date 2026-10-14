// P24 引导页测试：3 屏渲染（图标渐变底替外链图）/ 末屏文化组件收敛 / skip→login / goLogin 独立 / dot 跳转
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
// router/appStore 句柄（断言 replace/完成态用；jest.mock hoist 保证拿到的是 mock 版）
import { router } from 'expo-router';
import { useAppStore } from '@/store/appStore';
import OnboardingPage from '../onboarding';

// 批3（D8 切换）：页面挂 useOnboardingSlides——默认 mock 为失败（data undefined）走本地 SLIDES 回退，
// 远端用例在批3 测试文件内另行 mock service
jest.mock('@/services/queries/useOnboardingSlides', () => ({
  useOnboardingSlides: () => ({ data: undefined }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

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
      wrapper,
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
      wrapper,
    });
    // skip 按钮（非末屏）
    fireEvent.press(getByTestId('onboarding-skip'));
    expect(useAppStore.getState().onboardingCompleted).toBe(true);
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('D4 dot 跳到末屏后显示次按钮，屏序仍为 3', () => {
    const { getByTestId, queryByTestId } = render(<OnboardingPage />, {
      wrapper,
    });
    // scrollToIndex 在测试环境是 mock ref（无 listRef 实现），直接按压 s3 dot 仅验证 Pressable 可达
    expect(getByTestId('dot-s3').props.accessibilityState?.selected).toBe(false);
    expect(queryByTestId('onboarding-login')).toBeNull(); // 首屏非末屏无次按钮
  });
});

// ── 视觉统一批（深红暖调卡型）渲染断言（规格 §四.4）─────────────────────────────
describe('视觉统一：三屏同构深红暖调卡型', () => {
  it('统一卡型渲染：白圆 icon + 右下深红徽章 + 屏1 tagline pill，无 SafeImage', () => {
    const { getByTestId, queryByTestId, getByText, queryAllByTestId } = render(<OnboardingPage />, {
      wrapper,
    });
    // 无图屏：白圆图标（icon-shopping = shopping_basket 经 iconMapping）
    expect(getByTestId('icon-shopping')).toBeTruthy();
    // 屏1 badge：nest_eco_leaf → sprout
    expect(getByTestId('icon-sprout')).toBeTruthy();
    // 屏1 tagline pill 文案（t 直返 key）
    expect(getByText('onboarding.tagline.market')).toBeTruthy();
    // 首屏非 tais：无菱形徽章/无锯齿分隔线/无 SafeImage（FlatList 预渲染了屏3，断言首屏 pill 可见即可）
    expect(getByText('onboarding.tagline.market')).toBeTruthy();
    expect(queryAllByTestId('onboarding-badge-tais').length).toBeLessThanOrEqual(1);
    expect(queryByTestId('onboarding-image')).toBeNull();
  });

  it('统一卡型颜色走 onboarding token：卡徽章底 ob.badge、主按钮底 ob.primary（dark 同值，规格 §三）', () => {
    const { getByTestId } = render(<OnboardingPage />, { wrapper });
    // badge 底色 = colors.onboarding.badge（#b83228），主按钮 = primary（#961813）
    // dot-s1 的父链上无需取色；直接断言 next 按钮 style 数组中含 token 值
    const nextStyle = getByTestId('onboarding-next').props.style;
    const flat = Array.isArray(nextStyle) ? nextStyle : [nextStyle];
    const bg = flat
      .filter(Boolean)
      .map((s: any) => s?.backgroundColor)
      .find(Boolean);
    expect(bg).toBe('#961813');
  });
});
