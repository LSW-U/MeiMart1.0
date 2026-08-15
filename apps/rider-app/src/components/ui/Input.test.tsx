/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react';

import { Input } from './Input';

/**
 * Input 组件单测 —— B2 字段反馈与插槽升级（ReactNode slots + error/helperText + bg-surface）。
 *
 * web project（jsdom）；react-native host 壳同 Button.test（data-rn-host + data-prop-*）。
 */

function renderInput(props: Partial<Parameters<typeof Input>[0]> = {}) {
  return render(<Input label="手机号" placeholder="请输入手机号" value="" onChangeText={() => {}} {...props} />);
}

function host(container: HTMLElement, name: string): HTMLElement {
  const el = container.querySelector(`[data-rn-host="${name}"]`) as HTMLElement;
  if (!el) throw new Error(`host ${name} not rendered`);
  return el;
}

function attr(el: HTMLElement, name: string): string | undefined {
  const lower = `data-prop-${name.toLowerCase()}`;
  const exact = `data-prop-${name}`;
  return el.getAttribute(exact) ?? el.getAttribute(lower) ?? undefined;
}

/** 输入容器（border/bg 所在 View）的 className —— host 壳透传在 data-prop-classname */
function wrapperClass(container: HTMLElement): string {
  return attr(host(container, 'TextInput').parentElement as HTMLElement, 'className') ?? '';
}

describe('Input 默认态', () => {
  it('渲染 label、TextInput、placeholder', () => {
    const { container, getByText } = renderInput();
    expect(getByText('手机号')).toBeTruthy();
    const input = host(container, 'TextInput');
    expect(attr(input, 'placeholder')).toBe('请输入手机号');
    expect(attr(input, 'accessibilityLabel')).toBe('手机号');
  });

  it('容器为 bg-surface 非 bg-white', () => {
    const { container } = renderInput();
    const wrapper = wrapperClass(container);
    expect(wrapper).toContain('bg-surface');
    expect(wrapper).not.toContain('bg-white');
    expect(wrapper).toContain('border-outline-variant');
  });
});

describe('Input slots', () => {
  it('leftSlot/rightSlot 均渲染 ReactNode', () => {
    const { container } = renderInput({
      leftSlot: <span data-testid="slot-left">🔒</span>,
      rightSlot: <button data-testid="slot-right" type="button">发送</button>,
    });
    expect(container.querySelector('[data-testid="slot-left"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="slot-right"]')).not.toBeNull();
  });

  it('slot 内按钮保留自身 a11y props', () => {
    const { container } = renderInput({
      rightSlot: (
        <span data-rn-host="Pressable" data-prop-accessibilityrole="button" data-prop-accessibilitylabel="发送验证码">
          发送验证码
        </span>
      ),
    });
    const btn = container.querySelector('[data-rn-host="Pressable"]');
    expect(btn?.getAttribute('data-prop-accessibilitylabel')).toBe('发送验证码');
  });
});

describe('Input 反馈文本', () => {
  it('helperText 渲染且不影响边框', () => {
    const { container, getByText } = renderInput({ helperText: '我们将验证您的手机号' });
    expect(getByText('我们将验证您的手机号')).toBeTruthy();
    expect(wrapperClass(container)).toContain('border-outline-variant');
  });

  it('error 渲染、边框为 border-error', () => {
    const { container, getByText } = renderInput({ error: '手机号格式错误' });
    expect(getByText('手机号格式错误')).toBeTruthy();
    expect(wrapperClass(container)).toContain('border-error');
  });

  it('error 优先 helperText（同时传只显示 error）', () => {
    const { getByText, queryByText } = renderInput({ error: '手机号格式错误', helperText: '辅助说明' });
    expect(getByText('手机号格式错误')).toBeTruthy();
    expect(queryByText('辅助说明')).toBeNull();
  });
});
