/**
 * C-P2-17: PageErrorBoundary 硬编码中文改走 i18n + 「返回」补 accessibilityLabel
 *
 * ErrorBoundary 是 class 组件、崩溃态下 Provider 可能不可用——直接用 i18n 单例（不依赖
 * ThemeProvider/react-i18next hook）。渲染失败子树触发 getDerivedStateFromError。
 */
import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { PageErrorBoundary } from './PageErrorBoundary';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
}));

// 组件走 i18n 单例（@/i18n），不是 react-i18next hook——mock 单例形态
// （__esModule: true 必须显式给，否则 babel interop 把整个对象当 default，isInitialized 读不到）
jest.mock('@/i18n', () => ({
  __esModule: true,
  default: {
    isInitialized: true,
    t: (key: string) => key,
  },
}));

const getRouter = () =>
  (
    jest.requireMock('expo-router') as {
      router: { back: jest.Mock; replace: jest.Mock; canGoBack: jest.Mock };
    }
  ).router;

jest.mock('@/services/sentry', () => ({
  captureError: jest.fn(),
}));

function Boom(): null {
  throw new Error('kaboom');
}

describe('C-P2-17 PageErrorBoundary i18n + a11y', () => {
  beforeEach(() => {
    const router = getRouter();
    router.back.mockReset();
    router.replace.mockReset();
    router.canGoBack.mockReset().mockReturnValue(true);
    // 静默 React 对 error boundary 捕获的 console.error 噪音
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as unknown as jest.SpyInstance).mockRestore();
  });

  it('子树崩溃 → 渲染 i18n 失败态（pageError.title / pageError.messageFallback）', () => {
    const { getByText } = render(
      <PageErrorBoundary pageName="test">
        <Boom />
      </PageErrorBoundary>,
    );
    expect(getByText('pageError.title')).toBeTruthy();
    // error.message 优先于 messageFallback（Boom 抛了 'kaboom'）
    expect(getByText('kaboom')).toBeTruthy();
  });

  it('「返回」按钮有 accessibilityRole=button + accessibilityLabel=common.back（a11y）', () => {
    const { getByRole } = render(
      <PageErrorBoundary>
        <Boom />
      </PageErrorBoundary>,
    );
    const btn = getByRole('button');
    expect(btn.props.accessibilityLabel).toBe('common.back');
  });

  it('点返回：reset 错误态 + router.back（canGoBack=true 路径）', () => {
    const { getByRole } = render(
      <PageErrorBoundary>
        <Boom />
      </PageErrorBoundary>,
    );
    fireEvent.press(getByRole('button'));
    expect(getRouter().back).toHaveBeenCalledTimes(1);
    expect(getRouter().replace).not.toHaveBeenCalled();
  });

  it('canGoBack=false → router.replace(/(main)/home)（兜底回首页）', () => {
    getRouter().canGoBack.mockReturnValue(false);
    const { getByRole } = render(
      <PageErrorBoundary>
        <Boom />
      </PageErrorBoundary>,
    );
    fireEvent.press(getByRole('button'));
    expect(getRouter().replace).toHaveBeenCalledWith('/(main)/home');
  });

  it('未崩溃时正常渲染子树（透传）', () => {
    const { getByText } = render(
      <PageErrorBoundary>
        <Text>ok-content</Text>
      </PageErrorBoundary>,
    );
    expect(getByText('ok-content')).toBeTruthy();
  });
});
