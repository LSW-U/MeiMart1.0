/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { type ReactNode } from 'react';

import TermsPage from '../../../app/terms';
import PrivacyPage from '../../../app/privacy';
import { LegalPage } from '../../../src/components/layout/LegalPage';

/**
 * LegalPage + terms/privacy 单测 —— P5 §3.2/§3.5：抽取共享组件消除重复 + 版本号条。
 *
 * 覆盖拍板（P5 Q3=A 不替换正文 / Q5=A 仅版本+生效日期）：
 *   - terms 渲染 legal.terms.* + document 图标 + 版本号条
 *   - privacy 渲染 legal.privacy.* + shield 图标 + 版本号条
 *   - LegalPage 直接渲染 titleKey/bodyKey/versionKey prop
 *
 * 桩法同源（web project + RN host 壳）：useRiderSettings language='zh' + useGoBack mock。
 * mock 变量名前缀 mock*。
 */

const mockGoBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
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

function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(ui, { wrapper });
}

beforeEach(() => {
  mockGoBack.mockClear();
});

describe('LegalPage 共享组件（直接渲染）', () => {
  it('渲染 titleKey/bodyKey/versionKey 三段文案 + 传入图标', () => {
    const { getAllByText, getByText, container } = renderWithClient(
      <LegalPage
        titleKey="legal.terms.title"
        bodyKey="legal.terms.body"
        versionKey="legal.terms.version"
        icon="document"
        backLabel="返回"
      />,
    );
    // 标题在 SimplePageHeader（页头）+ hero 卡片两处出现（P5 共享组件结构，非 bug）
    expect(getAllByText('服务条款').length).toBeGreaterThanOrEqual(1);
    // 正文占位文案（zh 字典真值）
    expect(getByText('这里是骑手服务协议的占位文案，正式上线前将替换为最终版《服务条款》。')).toBeTruthy();
    // 版本号条（Q5=A 仅版本+生效日期）
    expect(getByText('版本 v1.0 · 生效日期 2026-08-01')).toBeTruthy();
    // AppIcon name="document" → MaterialCommunityIcons glyph file-document-outline（mock 渲染 data-testid）
    expect(container.querySelector('[data-testid="icon-file-document-outline"]')).not.toBeNull();
  });

  it('icon=shield 渲染 shield 图标', () => {
    const { container } = renderWithClient(
      <LegalPage
        titleKey="legal.privacy.title"
        bodyKey="legal.privacy.body"
        versionKey="legal.privacy.version"
        icon="shield"
        backLabel="返回"
      />,
    );
    // name="shield" → shield-account-outline
    expect(container.querySelector('[data-testid="icon-shield-account-outline"]')).not.toBeNull();
  });
});

describe('terms.tsx 改用 LegalPage', () => {
  it('渲染服务条款标题 + 正文 + 版本号 + document 图标', () => {
    const { getAllByText, getByText, container } = renderWithClient(<TermsPage />);
    expect(getAllByText('服务条款').length).toBeGreaterThanOrEqual(1);
    expect(getByText('版本 v1.0 · 生效日期 2026-08-01')).toBeTruthy();
    expect(container.querySelector('[data-testid="icon-file-document-outline"]')).not.toBeNull();
  });
});

describe('privacy.tsx 改用 LegalPage', () => {
  it('渲染隐私政策标题 + 正文 + 版本号 + shield 图标', () => {
    const { getAllByText, getByText, container } = renderWithClient(<PrivacyPage />);
    expect(getAllByText('隐私政策').length).toBeGreaterThanOrEqual(1);
    expect(getByText('版本 v1.0 · 生效日期 2026-08-01')).toBeTruthy();
    expect(container.querySelector('[data-testid="icon-shield-account-outline"]')).not.toBeNull();
  });
});
