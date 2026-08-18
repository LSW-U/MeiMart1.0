/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from '@testing-library/react';

import { BottomActionBar } from './BottomActionBar';

/**
 * BottomActionBar 组件单测 —— B5「设置入口 + 刷新胶囊」统一底栏（方案 §6）。
 *
 * web project（jsdom）+ RN host 壳。react-native-safe-area-context 在 jsdom 无
 * native runtime，mock useSafeAreaInsets 返回固定 insets（safe-area padding 断言用）。
 */

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

const settingsSpy = jest.fn();
const refreshSpy = jest.fn();

function renderBar(props: Partial<Parameters<typeof BottomActionBar>[0]> = {}) {
  return render(
    <BottomActionBar
      isRefreshing={false}
      refreshLabel="刷新"
      settingsLabel="设置"
      onPressSettings={settingsSpy}
      onRefresh={refreshSpy}
      {...props}
    />,
  );
}

function attr(el: Element | null, name: string): string | null {
  return el?.getAttribute(`data-prop-${name}`) ?? el?.getAttribute(`data-prop-${name.toLowerCase()}`) ?? null;
}

function pressables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('[data-rn-host="Pressable"]')) as HTMLElement[];
}

beforeEach(() => {
  settingsSpy.mockClear();
  refreshSpy.mockClear();
});

describe('BottomActionBar', () => {
  it('渲染设置入口与刷新胶囊，label 正确', () => {
    const { container, getByText } = renderBar();
    expect(getByText('设置')).toBeTruthy();
    expect(getByText('刷新')).toBeTruthy();
    const [settings, refresh] = pressables(container);
    expect(attr(settings, 'accessibilityLabel')).toBe('设置');
    expect(attr(refresh, 'accessibilityLabel')).toBe('刷新');
  });

  it('isRefreshing=false：refresh 图标、无 spinner、可点击', () => {
    const { container } = renderBar();
    expect(container.querySelector('[data-testid="icon-refresh"]')).not.toBeNull();
    expect(container.querySelector('[data-rn-host="ActivityIndicator"]')).toBeNull();
    fireEvent.click(pressables(container)[1]);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('isRefreshing=true：ActivityIndicator、disabled（不挂 onClick）、busy a11y、点击阻断', () => {
    const { container } = renderBar({ isRefreshing: true });
    expect(container.querySelector('[data-rn-host="ActivityIndicator"]')).not.toBeNull();
    const refresh = pressables(container)[1];
    // host 壳 disabled 表现为 onClick 不挂载（B1 既定约定），无 data-prop-disabled
    expect(refresh.onclick).toBeNull();
    expect(attr(refresh, 'accessibilityState')).toBe(JSON.stringify({ busy: true }));
    fireEvent.click(refresh);
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('absolute=true 时容器带 absolute 定位类名', () => {
    const { container } = renderBar({ absolute: true });
    expect(attr(container.firstElementChild as HTMLElement, 'className')).toContain('absolute bottom-0');
  });

  it('absolute=false 时无 absolute 类名', () => {
    const { container } = renderBar({ absolute: false });
    expect(attr(container.firstElementChild as HTMLElement, 'className')).not.toContain('absolute');
  });

  it('onPressSettings / onRefresh 各自触发，互不干扰', () => {
    const { container } = renderBar();
    fireEvent.click(pressables(container)[0]);
    expect(settingsSpy).toHaveBeenCalledTimes(1);
    expect(refreshSpy).not.toHaveBeenCalled();
    fireEvent.click(pressables(container)[1]);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(settingsSpy).toHaveBeenCalledTimes(1);
  });

  it('safe-area padding 应用到 style（mock insets.bottom=20 → paddingBottom=max(20,12)）', () => {
    const { container } = renderBar();
    const style = attr(container.firstElementChild as HTMLElement, 'style');
    expect(style).toBe(JSON.stringify({ paddingBottom: 20 }));
  });
});
