/**
 * AboutPage（app/about.tsx）渲染测试（P25，规则 8）
 *
 * 验证 P25 优化点：信任数据条三列、法律卡三行（license 占位不跳转）、
 * 社交三按钮、版本号来自 appInfo（非硬编码）、文化收敛（无 TaisPattern/Skyline）。
 */
import React from 'react';
import { Share } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { router as expoRouter } from 'expo-router';
import { ThemeProvider } from '@/theme';
import AboutPage from '../about';

// expo-router：mock 工厂内联 jest.fn()（工厂在 import 时求值，外层 const 尚处 TDZ——mockPush 前缀豁免仅豁免 lint，不豁免求值顺序）
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

// t 直返 key（断言用 key 而非译文）；mockT 可被单测覆写（F3 分段用例）
const mockT = jest.fn((key: string) => key);
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT, i18n: { language: 'en' } }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

// Share.share spy（jsdom/RNTL 下真 Share 不可用，spy 替代——RNTL 技法 memory 先例）
const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });

describe('AboutPage（P25）', () => {
  afterEach(() => {
    // F3 用例局部覆写过 t，还原为直返 key 默认实现
    mockT.mockImplementation((key: string) => key);
    mockT.mockClear();
  });

  it('信任数据条三列 + 使命卡渲染（D5/D12，文化收敛后无纹样组件）', () => {
    const { getByText, UNSAFE_root } = render(<AboutPage />, { wrapper });
    expect(getByText('about.statRegions')).toBeTruthy();
    expect(getByText('about.statMerchants')).toBeTruthy();
    expect(getByText('about.statOrders')).toBeTruthy();
    expect(getByText('about.mission')).toBeTruthy();
    expect(getByText('13')).toBeTruthy();
    expect(getByText('200+')).toBeTruthy();
    expect(getByText('50K+')).toBeTruthy(); // 测试环境 locale=en（F4：zh 下为「5万+」）
    // 文化收敛（D4）：页面里不再渲染 TaisPattern/UmaLulikSkyline
    // UNSAFE_root 全树查无纹样组件（TaisPattern 内部 Svg path 众多，这里查页面级 testID 即可）
    expect(UNSAFE_root.findAllByProps({ testID: 'about-tais-pattern' }).length).toBe(0);
  });

  it('mission 文案 `|` 分段渲染为 primary 加粗强调（F3，对齐原型 <b>）', () => {
    // 局部覆写 t：mission 返回带 | 分隔符的完整句（其余 key 直返）
    mockT.mockImplementation((key: string) =>
      key === 'about.mission'
        ? '连接东帝汶本地的|商家与消费者|，让采购更便捷，|送货到家|。'
        : key,
    );
    const { getByText } = render(<AboutPage />, { wrapper });
    // 拆段后「商家与消费者」「送货到家」是独立 Text 节点，可单独命中（mock 还原在 afterEach/下一用例）
    expect(getByText('商家与消费者')).toBeTruthy();
    expect(getByText('送货到家')).toBeTruthy();
    expect(getByText('连接东帝汶本地的')).toBeTruthy();
  });

  it('法律卡：terms/privacy 可点跳 legal 路由，license 占位显示 comingSoon 且不跳', () => {
    const mockPush = jest.mocked(expoRouter.push);
    mockPush.mockClear();
    const { getByTestId, getByText } = render(<AboutPage />, { wrapper });

    fireEvent.press(getByTestId('about-legal-terms'));
    expect(mockPush).toHaveBeenCalledWith('/legal/terms');

    fireEvent.press(getByTestId('about-legal-privacy'));
    expect(mockPush).toHaveBeenCalledWith('/legal/privacy');

    fireEvent.press(getByTestId('about-legal-license'));
    // 拍板 A：license 不跳（LegalType 仅 terms/privacy）--本轮只发生过上面两次 terms/privacy 调用
    expect(mockPush).toHaveBeenCalledTimes(2);
    expect(mockPush).not.toHaveBeenCalledWith('/legal/license');
    expect(getByText('legal.comingSoon')).toBeTruthy(); // 占位文案显示（复用 P17 key）
  });

  it('社交三按钮 + 评分/分享行渲染（D7/D8），分享触发 Share.share', () => {
    shareSpy.mockClear();
    const { getByTestId } = render(<AboutPage />, { wrapper });
    expect(getByTestId('about-social-facebook')).toBeTruthy();
    expect(getByTestId('about-social-whatsapp')).toBeTruthy();
    expect(getByTestId('about-social-instagram')).toBeTruthy();
    expect(getByTestId('about-rate')).toBeTruthy();

    fireEvent.press(getByTestId('about-share'));
    expect(shareSpy).toHaveBeenCalledTimes(1);
  });

  it('版本号来自 appInfo 单一数据源（D2，与 P17 设置页一致）', () => {
    const { getByText } = render(<AboutPage />, { wrapper });
    const appJson = jest.requireActual('../../app.json');
    expect(getByText(`v${appJson.expo.version}`)).toBeTruthy();
  });
});
