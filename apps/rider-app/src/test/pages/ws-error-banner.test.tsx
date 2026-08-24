/**
 * @jest-environment jsdom
 */
import { act, render } from '@testing-library/react';
import { type ReactNode } from 'react';

import { WsErrorBanner, WS_BANNER_DEBOUNCE_MS } from '../../../src/components/feedback/WsErrorBanner';
import type { RiderSocketState } from '../../../src/hooks/useRiderSocket';

/**
 * WsErrorBanner 单测 —— P6-3 §四.3+§四.4 修复点回归保护。
 *
 * 覆盖：
 *   - §四.3 disconnected 持续态纳入显示（不只 error）
 *   - §四.4 debounce：异常持续 > 3s 才显示，瞬态不闪
 *   - 恢复 connected 立即隐藏（无 debounce，正反馈）
 *   - connecting 首连瞬态不显示
 *
 * web project（jsdom）+ RN host 壳。WsErrorBanner 抽到独立组件 src/components/feedback/WsErrorBanner.tsx，
 *   测试直接渲染（不走 _layout 全树，避免 useLocation/useHeartbeat/NetInfo/expo-router 副作用）。
 *   useTranslation 桩掉走 key 直返；wsState 由 prop 直注；fakeTimers 控 3s debounce。
 */

// 桩 useTranslation：返回 t = key 直返（断言用 key 串）
jest.mock('../../../src/i18n/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'zh' as const }),
}));

const WS_TEXT = 'common.wsDisconnected';

function renderBanner(wsState: RiderSocketState) {
  return render(<WsErrorBanner wsState={wsState} />, {
    wrapper: ({ children }: { children: ReactNode }) => <>{children}</>,
  });
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('P6-3 WsErrorBanner §四.3+§四.4', () => {
  it('connecting 首连瞬态：不显示 Banner', () => {
    const { queryByText } = renderBanner('connecting');
    expect(queryByText(WS_TEXT)).toBeNull();
  });

  it('connected：不显示 Banner', () => {
    const { queryByText } = renderBanner('connected');
    expect(queryByText(WS_TEXT)).toBeNull();
  });

  it('§四.4 debounce：error 持续 < 3s 不显示，> 3s 才显示', () => {
    const { queryByText } = renderBanner('error');

    // 0~3s 内：异常持续但 debounce 未到，不显示
    act(() => {
      jest.advanceTimersByTime(WS_BANNER_DEBOUNCE_MS - 1);
    });
    expect(queryByText(WS_TEXT)).toBeNull();

    // 满 3s：debounce 到，显示
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(queryByText(WS_TEXT)).not.toBeNull();
  });

  it('§四.3 disconnected 持续态：> 3s 也显示（不只 error）', () => {
    const { queryByText } = renderBanner('disconnected');
    act(() => {
      jest.advanceTimersByTime(WS_BANNER_DEBOUNCE_MS);
    });
    expect(queryByText(WS_TEXT)).not.toBeNull();
  });

  it('§四.4 弱网抖动：error 持续 1s 后恢复 connected，不显示（debounce 过滤闪烁）', () => {
    const { queryByText, rerender } = render(<WsErrorBanner wsState="error" />, {
      wrapper: ({ children }: { children: ReactNode }) => <>{children}</>,
    });

    // 异常持续 1s（未到 debounce 阈值）
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(queryByText(WS_TEXT)).toBeNull();

    // 恢复 connected：立即隐藏（即便未到 3s 也不显示）
    rerender(<WsErrorBanner wsState="connected" />);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(queryByText(WS_TEXT)).toBeNull();
  });

  it('恢复正反馈：显示后切 connected 立即隐藏（无 debounce）', () => {
    const { queryByText, rerender } = render(<WsErrorBanner wsState="error" />, {
      wrapper: ({ children }: { children: ReactNode }) => <>{children}</>,
    });

    // 先让 Banner 显示（异常持续 > 3s）
    act(() => {
      jest.advanceTimersByTime(WS_BANNER_DEBOUNCE_MS);
    });
    expect(queryByText(WS_TEXT)).not.toBeNull();

    // 恢复 connected：立即隐藏
    rerender(<WsErrorBanner wsState="connected" />);
    expect(queryByText(WS_TEXT)).toBeNull();
  });
});
