/**
 * @jest-environment jsdom
 */
import { act, render } from '@testing-library/react';

import { showToast, ToastHost } from './Toast';

/**
 * Toast 单测 —— 审查 P3-1：MAX_QUEUE=3 截断（弱网连点 toast 风暴防堆叠）+ a11y 三齐。
 *
 * web project（jsdom）渲染；react-native 已由 moduleNameMapper 换成 host 壳，
 * Animated.timing 启动即同步完成回调（不卡动画），时序由 setTimeout 主导。
 * ToastHost 通过模块级 listeners 订阅 showToast —— 渲染后调用 showToast 即入队。
 */

function renderHost() {
  return render(<ToastHost />);
}

function textsOf(container: HTMLElement) {
  return Array.from(container.querySelectorAll('[data-rn-host="Text"]')).map((el) => el.textContent);
}

describe('ToastHost 队列上限（P3-1）', () => {
  it('连续 4 条只保留最新 3 条（丢最旧）', () => {
    const { container, unmount } = renderHost();
    act(() => {
      showToast('toast-1');
      showToast('toast-2');
      showToast('toast-3');
      showToast('toast-4');
    });
    expect(textsOf(container)).toEqual(['toast-2', 'toast-3', 'toast-4']);
    unmount();
  });

  it('3 条以内不截断', () => {
    const { container, unmount } = renderHost();
    act(() => {
      showToast('toast-a');
      showToast('toast-b');
    });
    expect(textsOf(container)).toEqual(['toast-a', 'toast-b']);
    unmount();
  });

  it('error toast 有 role=alert + liveRegion=polite + label（P3-1 a11y 附带核对）', () => {
    const { container, unmount } = renderHost();
    act(() => {
      showToast('网络错误', 'error');
    });
    const alert = container.querySelector('[data-prop-accessibilityrole="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.getAttribute('data-prop-accessibilityliveregion')).toBe('polite');
    expect(alert?.getAttribute('data-prop-accessibilitylabel')).toBe('网络错误');
    unmount();
  });
});
