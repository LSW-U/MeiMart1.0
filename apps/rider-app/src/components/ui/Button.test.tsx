/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from '@testing-library/react';

import { Button } from './Button';

/**
 * Button 组件单测 —— B1 防重复提交（disabled/loading 真实阻断 + a11y state + spinner）。
 *
 * web project（jsdom）渲染；react-native 已由 moduleNameMapper 换成
 * src/test/react-native.mock.js 的 host 壳：Pressable 渲染 div、onPress 接到
 * click、disabled 时 click 不挂载（真实阻断），props 原样透传到 data-prop-*。
 */

const pressSpy = jest.fn();

function renderButton(props: Partial<Parameters<typeof Button>[0]> = {}) {
  return render(
    <Button onPress={pressSpy} {...props}>
      提交
    </Button>,
  );
}

function hostProps(container: HTMLElement, host: string): Record<string, string | undefined> {
  const el = container.querySelector(`[data-rn-host="${host}"]`) as HTMLElement;
  if (!el) throw new Error(`host ${host} not rendered`);
  const props: Record<string, string | undefined> = {};
  for (const attr of Array.from(el.attributes)) {
    if (attr.name.startsWith('data-prop-')) props[attr.name.slice('data-prop-'.length)] = attr.value;
  }
  return props;
}

// React DOM 会把自定义属性名小写化（accessibilityState -> accessibilitystate）
function prop(props: Record<string, string | undefined>, name: string): string | undefined {
  return props[name] ?? props[name.toLowerCase()];
}

const pressButton = (container: HTMLElement) => fireEvent.click(container.querySelector('[data-rn-host="Pressable"]') as HTMLElement);

beforeEach(() => {
  pressSpy.mockClear();
});

describe('Button 默认态', () => {
  it('可点击且无 spinner，onPress 触发', () => {
    const { container } = renderButton();
    expect(container.querySelector('[data-rn-host="ActivityIndicator"]')).toBeNull();
    pressButton(container);
    expect(pressSpy).toHaveBeenCalledTimes(1);
  });

  it('accessibilityState 默认无 disabled/busy', () => {
    const { container } = renderButton();
    expect(prop(hostProps(container, 'Pressable'), 'accessibilityState')).toBe(JSON.stringify({ disabled: false, busy: false }));
  });
});

describe('Button loading 态', () => {
  it('不可点击且显示 spinner，原 icon 隐藏', () => {
    const { container } = renderButton({ loading: true, icon: <span>icon-x</span> });
    pressButton(container);
    expect(pressSpy).not.toHaveBeenCalled();
    expect(container.querySelector('[data-rn-host="ActivityIndicator"]')).not.toBeNull();
    expect(container.innerHTML).not.toContain('icon-x');
  });

  it('accessibilityState.busy = true', () => {
    const { container } = renderButton({ loading: true });
    expect(prop(hostProps(container, 'Pressable'), 'accessibilityState')).toBe(JSON.stringify({ disabled: true, busy: true }));
  });

  it('pending 期间连点全部阻断，loading 解除后可点且只触发一次', () => {
    const { container, rerender } = renderButton({ loading: true });
    pressButton(container);
    pressButton(container);
    pressButton(container);
    expect(pressSpy).not.toHaveBeenCalled();
    rerender(
      <Button loading={false} onPress={pressSpy}>
        提交
      </Button>,
    );
    pressButton(container);
    expect(pressSpy).toHaveBeenCalledTimes(1);
  });
});

describe('Button disabled 态', () => {
  it('不可点击', () => {
    const { container } = renderButton({ disabled: true });
    pressButton(container);
    expect(pressSpy).not.toHaveBeenCalled();
  });

  it('accessibilityState.disabled = true 且无 spinner', () => {
    const { container } = renderButton({ disabled: true });
    expect(prop(hostProps(container, 'Pressable'), 'accessibilityState')).toBe(JSON.stringify({ disabled: true, busy: false }));
    expect(container.querySelector('[data-rn-host="ActivityIndicator"]')).toBeNull();
  });
});

describe('Button loading + disabled 并存', () => {
  it('disabled/busy 均正确', () => {
    const { container } = renderButton({ loading: true, disabled: true });
    expect(prop(hostProps(container, 'Pressable'), 'accessibilityState')).toBe(JSON.stringify({ disabled: true, busy: true }));
  });
});

describe('Button a11y 与 spinner 颜色', () => {
  it('自定义 accessibilityLabel 优先于 children fallback', () => {
    const { container } = renderButton({ accessibilityLabel: '确认送达' });
    expect(prop(hostProps(container, 'Pressable'), 'accessibilityLabel')).toBe('确认送达');
  });

  it('children 纯字符串时作为 label fallback', () => {
    const { container } = renderButton();
    expect(prop(hostProps(container, 'Pressable'), 'accessibilityLabel')).toBe('提交');
  });

  it('indicatorColor 正确用于 spinner', () => {
    const { container } = renderButton({ loading: true, indicatorColor: '#ff0000' });
    expect(prop(hostProps(container, 'ActivityIndicator'), 'color')).toBe('#ff0000');
  });
});
