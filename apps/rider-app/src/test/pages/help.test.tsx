/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render } from '@testing-library/react';
import { type ReactNode } from 'react';
import { Linking } from 'react-native';

import HelpPage from '../../../app/help';
import { showToast } from '../../../src/components/feedback/Toast';

const showToastMock = showToast as jest.Mock;

/**
 * HelpPage 单测 —— P5：客服热线可拨号 + 在线客服入口 + 法律文件入口。
 *
 * 覆盖拍板（P5 Q1-Q5 全 A）：
 *   P5-1/2/3  客服号码走 i18n + 空值兜底 + Pressable Linking.openURL('tel:...') + 拨号失败 toast
 *   P5-7      在线客服入口（Q1=A 占位路由 /help/chat）
 *   P5-6      法律文件 section（服务条款/隐私政策）登录后可达
 *   P5-4/5    terms/privacy 抽 LegalPage（见 legal-page.test.tsx 单独覆盖）
 *
 * 桩法与 settings/notifications.test 同源（web project + RN host 壳）：
 *   - useRiderSettings：language='zh' 走 zh 字典（拨号 toast 断言中文）
 *   - expo-router useRouter：mockPush 断言跳转目标
 *   - Linking：mock 壳注入 openURL stub（tel: 断言）
 *   - useGoBack：SimplePageHeader 内部用，mock 返回 fn
 *   - showToast：mock 模块取 spy
 * mock 变量名前缀 mock*（jest factory 白名单要求）。
 */

const mockPush = jest.fn();
const mockGoBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('../../../src/hooks/useGoBack', () => ({
  useGoBack: () => mockGoBack,
}));

jest.mock('../../../src/services/queries/useSettings', () => ({
  useRiderSettings: () => ({ data: { dutyStatus: 'onDuty', language: 'zh' } }),
}));

jest.mock('../../../src/components/feedback/Toast', () => ({
  showToast: jest.fn(),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<HelpPage />, { wrapper });
}

beforeEach(() => {
  mockPush.mockClear();
  mockGoBack.mockClear();
  showToastMock.mockClear();
  // 原因：react-native.mock.js 的 Linking.openURL 默认全通过，测试用例按需覆写为 stub 控制行为（同 sign.test:114 范式）
  (Linking as unknown as { openURL: jest.Mock }).openURL = jest.fn(async () => undefined);
});

describe('P5-1/2/3 客服热线可拨号 + i18n + fallback', () => {
  it('显示客服号码（i18n 真值 +670 7700 0000），非硬编码裸字符串', () => {
    const { getByText } = renderPage();
    // 走 t('help.support.phone')，zh 字典值为 +670 7700 0000
    expect(getByText('+670 7700 0000')).toBeTruthy();
  });

  it('点客服号码 → Linking.openURL("tel:+670 7700 0000") 唤起拨号', async () => {
    const { getByText } = renderPage();
    await act(async () => {
      fireEvent.click(getByText('+670 7700 0000'));
    });
    expect((Linking as unknown as { openURL: jest.Mock }).openURL).toHaveBeenCalledWith('tel:+670 7700 0000');
  });

  it('拨号失败（openURL reject）→ showToast(拨号失败，请稍后重试, error)', async () => {
    (Linking as unknown as { openURL: jest.Mock }).openURL = jest.fn(async () => {
      throw new Error('no dialer');
    });
    const { getByText } = renderPage();
    await act(async () => {
      fireEvent.click(getByText('+670 7700 0000'));
    });
    expect(showToastMock).toHaveBeenCalledWith('拨号失败，请稍后重试', 'error');
  });

  it('号码 Pressable 带 accessibilityRole=link + phoneLabel a11y', () => {
    const { container } = renderPage();
    // 原因：RN host 壳经 data-prop-* 透传 a11y，querySelector 返回类型无此字段，交叉类型断言取属性（非 as unknown as，更精确）
    const phoneLink = container.querySelector('[data-rn-host="Pressable"][data-prop-accessibilityrole="link"]') as HTMLElement & { getAttribute: (n: string) => string | null };
    expect(phoneLink).not.toBeNull();
    expect(phoneLink.getAttribute('data-prop-accessibilitylabel')).toBe('拨打客服热线');
  });
});

describe('P5-7 在线客服入口（Q1=A 占位路由）', () => {
  it('显示在线客服入口卡片（标题 + 描述 + chevronRight）', () => {
    const { getByText } = renderPage();
    expect(getByText('在线客服')).toBeTruthy();
    expect(getByText('文字咨询，工作日 8:00-20:00')).toBeTruthy();
  });

  it('点在线客服 → router.push("/help/chat") 跳占位路由', () => {
    const { getByText } = renderPage();
    fireEvent.click(getByText('在线客服'));
    expect(mockPush).toHaveBeenCalledWith('/help/chat');
  });
});

describe('P5-6 法律文件 section（登录后可达 terms/privacy）', () => {
  it('底部显示服务条款 + 隐私政策两个入口', () => {
    const { getByText } = renderPage();
    expect(getByText('服务条款')).toBeTruthy();
    expect(getByText('隐私政策')).toBeTruthy();
  });

  it('点服务条款 → router.push("/terms")', () => {
    const { getByText } = renderPage();
    fireEvent.click(getByText('服务条款'));
    expect(mockPush).toHaveBeenCalledWith('/terms');
  });

  it('点隐私政策 → router.push("/privacy")', () => {
    const { getByText } = renderPage();
    fireEvent.click(getByText('隐私政策'));
    expect(mockPush).toHaveBeenCalledWith('/privacy');
  });
});
