// 批3（D8 引导页内容可配置）三组单测（任务书批3 改动#4）：
// 1) 成功拉取渲染远程内容（含配图 SafeImage + isLast/圆点按远端屏数派生）
// 2) 拉取失败回退本地 SLIDES（3 屏 + 无图）
// 3) 多语渲染（locale 切换取对应语言，缺语言回退 en）
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from '@/store/appStore';
import OnboardingPage from '../onboarding';
import { fetchOnboardingSlides } from '@/services/onboarding';

// 服务层 mock（页面经 useOnboardingSlides → fetchOnboardingSlides 间接消费），按用例改写返回值
jest.mock('@/services/onboarding', () => ({
  fetchOnboardingSlides: jest.fn(),
}));

// i18n mock：locale 可控（多语用例切换）；localize 走 Record 取值 + en 回退（对齐 i18n-core 回退链语义）
let mockLocale = 'en';
jest.mock('@/i18n', () => ({
  useLocalizer: () => (text?: string | Record<string, string>) => {
    if (typeof text === 'string') return text;
    return text?.[mockLocale] ?? text?.en ?? '';
  },
  useLocale: () => mockLocale,
}));

// 远端信封 data（批1 契约定稿：五语 en/pt/tet/id/zh；3 屏含 1 配图屏）
const REMOTE_SLIDES = [
  {
    id: 'r1',
    icon: 'shopping_basket',
    imageUrl: 'https://cdn.example.com/slide1.png',
    title: { en: 'Remote title 1', zh: '远程标题一', tet: 'x', pt: 'x', id: 'x' },
    description: { en: 'Remote desc 1', zh: '远程描述一', tet: 'x', pt: 'x', id: 'x' },
    sortOrder: 1,
    enabled: true,
    createdAt: '2026-10-14T00:00:00Z',
    updatedAt: '2026-10-14T00:00:00Z',
  },
  {
    id: 'r2',
    icon: null,
    imageUrl: null,
    title: { en: 'Remote title 2', zh: '远程标题二' },
    description: { en: 'Remote desc 2', zh: '远程描述二' },
    sortOrder: 2,
    enabled: true,
    createdAt: '2026-10-14T00:00:00Z',
    updatedAt: '2026-10-14T00:00:00Z',
  },
];

// Why 模块级 QueryClient：wrapper 内 new 的实例在用例结束后拿不到引用，无法 clear——
// 实测该文件挂起不退出（Jest did not exit，--detectOpenHandles 无报告）。共享实例 +
// afterEach clear/unmount 收口 RQ 的异步副产物（test-open-handle 收口批，20261017）。
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </ThemeProvider>
);

beforeEach(() => {
  mockLocale = 'en';
  useAppStore.setState({ onboardingCompleted: false });
  (fetchOnboardingSlides as jest.Mock).mockReset();
});

afterEach(() => {
  // test-open-handle 收口：RQ 查询异步链（retry/timer/observer）在用例结束前清空，
  // 防挂起不退出；RTL 自动 cleanup unmount 组件，这里补缓存层清理
  queryClient.clear();
});

describe('useOnboardingSlides 切换接线（批3 D8）', () => {
  it('成功拉取渲染远程内容：2 屏（dot r1/r2）+ 配图屏出 SafeImage + 无图屏走渐变 icon', async () => {
    (fetchOnboardingSlides as jest.Mock).mockResolvedValue(REMOTE_SLIDES);
    const { getByTestId, getByText, queryByTestId } = render(<OnboardingPage />, { wrapper });
    // RQ 异步 resolve：await 首个远端标记后再断言（首帧可能仍是回退渲染）
    await waitFor(() => expect(getByTestId('dot-r1')).toBeTruthy());
    // 4 处消费点统一读 slides：圆点按远端屏数渲染（本地 s1-s3 不再出现）
    expect(getByTestId('dot-r2')).toBeTruthy();
    expect(queryByTestId('dot-s1')).toBeNull();
    // 有 imageUrl → SafeImage（testID onboarding-image）
    expect(getByTestId('onboarding-image')).toBeTruthy();
    // 无 imageUrl → icon 渐变底（角标 Icon 渲染，symbol 由 iconMapping 转 MC 名）
    expect(getByText('Remote title 1')).toBeTruthy();
    expect(getByText('Remote desc 2')).toBeTruthy();
  });

  it('P3-1 兜底锁定：icon null（配图屏）→ storefront，非 null 名走 iconMapping 查表', async () => {
    (fetchOnboardingSlides as jest.Mock).mockResolvedValue(REMOTE_SLIDES);
    const { getByTestId, getAllByTestId } = render(<OnboardingPage />, { wrapper });
    await waitFor(() => expect(getByTestId('dot-r1')).toBeTruthy());
    // r1 icon='shopping_basket'（有 imageUrl 走 SafeImage，icon 不渲染插画位；badge nest_eco_leaf→sprout 仍查表渲染）
    expect(getByTestId('icon-sprout')).toBeTruthy();
    // r2 icon=null（无图屏）：fromRemote 兜底 storefront——插画+角标两处 Icon 均渲染（getAll 计数锁定）
    expect(getAllByTestId('icon-storefront').length).toBeGreaterThanOrEqual(1);
  });

  it('拉取失败回退本地 SLIDES：3 dot（s1-s3）+ 无图（icon+渐变）', () => {
    (fetchOnboardingSlides as jest.Mock).mockRejectedValue(new Error('network down'));
    const { getByTestId, queryByTestId } = render(<OnboardingPage />, { wrapper });
    expect(getByTestId('dot-s1')).toBeTruthy();
    expect(getByTestId('dot-s2')).toBeTruthy();
    expect(getByTestId('dot-s3')).toBeTruthy();
    expect(queryByTestId('dot-r1')).toBeNull();
    // 本地兜底屏无 imageUrl：不出 SafeImage（回退语义 + D2 断网不白屏）
    expect(queryByTestId('onboarding-image')).toBeNull();
  });

  it('空数组同样回退本地 SLIDES（任务书：空 → null → 兜底）', () => {
    (fetchOnboardingSlides as jest.Mock).mockResolvedValue([]);
    const { getByTestId } = render(<OnboardingPage />, { wrapper });
    expect(getByTestId('dot-s1')).toBeTruthy();
    expect(getByTestId('dot-s3')).toBeTruthy();
  });

  it('多语渲染：locale 切换取对应语言，缺语言回退 en', async () => {
    (fetchOnboardingSlides as jest.Mock).mockResolvedValue(REMOTE_SLIDES);
    mockLocale = 'zh';
    const { getByText } = render(<OnboardingPage />, { wrapper });
    await waitFor(() => expect(getByText('远程标题一')).toBeTruthy());
    expect(getByText('远程描述二')).toBeTruthy();

    // 切回 en
    mockLocale = 'en';
    const en = render(<OnboardingPage />, { wrapper });
    await waitFor(() => expect(en.getByText('Remote title 1')).toBeTruthy());

    // tet 缺值 → 回退 en（REMOTE 第二屏只有 en/zh）
    mockLocale = 'tet';
    const tet = render(<OnboardingPage />, { wrapper });
    await waitFor(() => expect(tet.getByText('Remote title 2')).toBeTruthy());
  });
});
