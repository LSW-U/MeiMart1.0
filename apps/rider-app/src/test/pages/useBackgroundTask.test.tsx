/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import { useBackgroundTask } from '../../../src/hooks/useBackgroundTask';

/**
 * 第四轮修复 P1-2（V2）：定位任务 start 不随宿主重渲染增长——
 * 原 effect deps 含 useTranslation 的 t（每渲染新引用）→ 宿主每次重渲染销毁重建
 * 定位任务（反复 start/stopLocationUpdatesAsync）。修复后 deps=[enabled, language]，
 * effect 内改用纯函数 translate(language,...)。
 *
 * 测试桩：LanguageContext 注入固定 language；expo-location/expo-task-manager/
 * Toast 等最小 mock（页面测试四层 mock 模式，与 useLocation.test 同源）。
 */

const mockStart = jest.fn(async () => undefined);
const mockStop = jest.fn(async () => undefined);
const mockShowToast = jest.fn();

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestBackgroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  startLocationUpdatesAsync: (...args: unknown[]) => mockStart(...(args as [])),
  stopLocationUpdatesAsync: (...args: unknown[]) => mockStop(...(args as [])),
  Accuracy: { High: 4 },
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
}));

jest.mock('../../../src/components/feedback/Toast', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...(args as [])),
}));

// useBackgroundTask 经 services/sentry 拉入 @sentry/react-native（ESM 发布，jsdom 不
// transform；web project transformIgnorePatterns 不放行它）。hook 消费的只有 captureError，
// 桩掉整个 sentry 模块即可（不注入 DSN 时真实 initSentry 也是 no-op，语义等价）。
jest.mock('../../../src/services/sentry', () => ({
  captureError: jest.fn(),
  initSentry: jest.fn(),
}));

// LanguageContext mock：ctx 实例挂全局，本文件的 Wrapper Provider 与 mock 工厂共用同一
// Context 对象（jest.mock 工厂提升到 import 前，工厂内建 ctx、Wrapper 经全局取同一实例）
let currentTestLanguage = 'zh';

jest.mock('../../../src/i18n/LanguageContext', () => {
  const react = require('react');
  const TestCtx = react.createContext('zh');
  (globalThis as Record<string, unknown>).__testLangReactCtx = TestCtx;
  return {
    LanguageContext: TestCtx,
    useLanguageContext: () => ({
      language: react.useContext(TestCtx),
      setLanguage: () => {},
    }),
  };
});

function Wrapper({ children }: { children: ReactNode }) {
  const TestCtx = (globalThis as Record<string, unknown>).__testLangReactCtx as {
    Provider: (p: { value: string; children: ReactNode }) => ReactNode;
  };
  return <TestCtx.Provider value={currentTestLanguage}>{children}</TestCtx.Provider>;
}

beforeEach(() => {
  mockStart.mockClear();
  mockStop.mockClear();
  mockShowToast.mockClear();
  currentTestLanguage = 'zh';
  // RN mock 壳 Platform.OS 读 __RN_PLATFORM_OS__（web 值会走 web 守卫跳过 effect）
  (globalThis as typeof globalThis & { __RN_PLATFORM_OS__?: string }).__RN_PLATFORM_OS__ = 'ios';
});

describe('P1-2（V2）：useBackgroundTask effect 不随宿主重渲染重启定位', () => {
  it('enabled=true：启动一次 startLocationUpdatesAsync', async () => {
    const rendered = renderHook(() => useBackgroundTask({ enabled: true, currentOrderId: 'o1' }), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(1));
    expect(rendered.result.current.isRegistered).toBe(true);
  });

  it('V2：宿主重渲染（同 props rerender）不触发 stop/start（deps 无 t）', async () => {
    const { rerender } = renderHook(
      ({ enabled }) => useBackgroundTask({ enabled, currentOrderId: 'o1' }),
      { initialProps: { enabled: true }, wrapper: Wrapper },
    );
    await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(1));
    // 修复前 t 引用每次渲染都变 → effect 重建 → stop+start 各 3 次；修复后零变化
    rerender({ enabled: true });
    rerender({ enabled: true });
    rerender({ enabled: true });
    await act(async () => {});
    expect(mockStop).not.toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalledTimes(1); // 不随重渲染增长
  });

  it('enabled 切 false：stop 一次（正常生命周期仍工作）', async () => {
    const { rerender } = renderHook(
      ({ enabled }) => useBackgroundTask({ enabled, currentOrderId: 'o1' }),
      { initialProps: { enabled: true }, wrapper: Wrapper },
    );
    await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(1));
    rerender({ enabled: false });
    await waitFor(() => expect(mockStop).toHaveBeenCalledTimes(1));
  });
});
