/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from '@testing-library/react';

import { getBasePressables } from '../../test/rn-host-utils';
import { Modal } from './Modal';

/**
 * R-P1-13（走查 20261024 · D4=B）：弹窗基座行为契约——backdrop 点击关闭、内容区点击
 * 不误关（stopPropagation 阻 web 冒泡）、role=alert 对话框语义、visible=false 不渲染；
 * 审查修复 20261025：backdrop 关闭面 a11y（role=button + 注入 label）、捕获层读屏隐藏。
 */

const closeSpy = jest.fn();

function renderModal(props: Partial<Parameters<typeof Modal>[0]> = {}) {
  return render(
    <Modal backdropCloseLabel="关闭" visible onClose={closeSpy} {...props}>
      内容
    </Modal>,
  );
}

describe('Modal 弹窗基座', () => {
  beforeEach(() => {
    closeSpy.mockClear();
  });

  it('visible=true 渲染内容；visible=false 不渲染', () => {
    const hidden = renderModal({ visible: false });
    expect(hidden.container.querySelector('[data-rn-host="Modal"]')).toBeNull();

    const shown = renderModal();
    expect(shown.container.textContent).toContain('内容');
  });

  it('backdrop 点击触发 onClose', () => {
    const { container } = renderModal();
    // 基座前两个 Pressable = backdrop / sheet 触摸捕获层（具名访问见 rn-host-utils）
    fireEvent.click(getBasePressables(container)[0]);
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('sheet 内容点击不误关（阻冒泡）', () => {
    const { container } = renderModal();
    fireEvent.click(getBasePressables(container)[1]);
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('内容区带 role=alert（对话框语义）', () => {
    const { container } = renderModal();
    expect(container.querySelector('[data-prop-accessibilityrole="alert"]')).not.toBeNull();
  });

  it('审查修复 20261025：backdrop 关闭面可名状（role=button + label），捕获层对读屏隐藏', () => {
    const { container } = renderModal();
    const [backdrop, sheet] = getBasePressables(container);
    expect(backdrop.getAttribute('data-prop-accessibilityrole')).toBe('button');
    expect(backdrop.getAttribute('data-prop-accessibilitylabel')).toBe('关闭');
    expect(sheet.getAttribute('data-prop-accessibilityelementshidden')).toBe('true');
    expect(sheet.getAttribute('data-prop-importantforaccessibility')).toBe('no');
  });
});
