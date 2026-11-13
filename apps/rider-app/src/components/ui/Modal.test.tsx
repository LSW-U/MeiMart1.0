/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from '@testing-library/react';

import { getBasePressables, getBaseViews } from '../../test/rn-host-utils';
import { Modal } from './Modal';

/**
 * R-P1-13（走查 20261024 · D4=B）：弹窗基座行为契约——backdrop 点击关闭、内容区点击
 * 不误关（stopPropagation 阻 web 冒泡）、role=alert 对话框语义、visible=false 不渲染。
 * 双轨（修复 20261027）：web 分支 backdrop/sheet 用 View onClick（消除 RNW role=button
 * 渲染真 <button> 与内容交互元素的嵌套非法 DOM）；native 分支保留 Pressable 结构。
 * 测试环境 Platform.OS 默认 'web'（react-native.mock 壳），native 分支翻转 __RN_PLATFORM_OS__。
 */

const closeSpy = jest.fn();

// jsdom 无 Node 的 global 类型（tsc 报 TS2304）——jsdom 里 window 即全局，挂 window 等价
const globalRef = window as typeof window & { __RN_PLATFORM_OS__?: 'web' | 'ios' | 'android' };

function renderModal(props: Partial<Parameters<typeof Modal>[0]> = {}) {
  return render(
    <Modal backdropCloseLabel="关闭" visible onClose={closeSpy} {...props}>
      内容
    </Modal>,
  );
}

describe('Modal 弹窗基座（web 分支，Platform.OS=web 默认）', () => {
  beforeEach(() => {
    closeSpy.mockClear();
    delete globalRef.__RN_PLATFORM_OS__;
  });

  it('visible=true 渲染内容；visible=false 不渲染', () => {
    const hidden = renderModal({ visible: false });
    expect(hidden.container.querySelector('[data-rn-host="Modal"]')).toBeNull();

    const shown = renderModal();
    expect(shown.container.textContent).toContain('内容');
  });

  it('backdrop 点击触发 onClose', () => {
    const { container } = renderModal();
    const [backdrop, sheet] = getBaseViews(container);
    fireEvent.click(backdrop);
    expect(closeSpy).toHaveBeenCalledTimes(1);
    fireEvent.click(sheet);
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('web 分支无 Pressable（消除 <button> 嵌套）且 backdrop/sheet 无 button role', () => {
    const { container } = renderModal();
    expect(container.querySelectorAll('[data-rn-host="Pressable"]')).toHaveLength(0);
    const [backdrop, sheet] = getBaseViews(container);
    expect(backdrop.getAttribute('data-prop-accessibilityrole')).toBeNull();
    expect(sheet.getAttribute('data-prop-accessibilityelementshidden')).toBeNull();
  });

  it('内容区带 role=alert（对话框语义）', () => {
    const { container } = renderModal();
    expect(container.querySelector('[data-prop-accessibilityrole="alert"]')).not.toBeNull();
  });
});

describe('Modal 弹窗基座（native 分支，__RN_PLATFORM_OS__=ios）', () => {
  beforeEach(() => {
    closeSpy.mockClear();
    globalRef.__RN_PLATFORM_OS__ = 'ios';
  });
  afterEach(() => {
    delete globalRef.__RN_PLATFORM_OS__;
  });

  it('backdrop 点击关闭、sheet 点击不误关（阻冒泡）', () => {
    const { container } = renderModal();
    const [backdrop, sheet] = getBasePressables(container);
    fireEvent.click(backdrop);
    expect(closeSpy).toHaveBeenCalledTimes(1);
    fireEvent.click(sheet);
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('backdrop 关闭面可名状（role=button + label），捕获层对读屏隐藏', () => {
    const { container } = renderModal();
    const [backdrop, sheet] = getBasePressables(container);
    expect(backdrop.getAttribute('data-prop-accessibilityrole')).toBe('button');
    expect(backdrop.getAttribute('data-prop-accessibilitylabel')).toBe('关闭');
    expect(sheet.getAttribute('data-prop-accessibilityelementshidden')).toBe('true');
    expect(sheet.getAttribute('data-prop-importantforaccessibility')).toBe('no');
  });
});
