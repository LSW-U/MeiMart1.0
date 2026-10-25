/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from '@testing-library/react';

import { getBasePressables } from '../../test/rn-host-utils';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * R-P1-13 迁移回归：ConfirmDialog 走 Modal 基座后动作契约不回归
 * （ok/cancel 回调、backdrop 关闭走 onCancel、sheet 内点击不误关）。
 */

const okSpy = jest.fn();
const cancelSpy = jest.fn();

function renderDialog() {
  return render(
    <ConfirmDialog
      cancelLabel="取消"
      message="确认要退出吗"
      okLabel="确认"
      title="提示"
      visible
      onCancel={cancelSpy}
      onOk={okSpy}
    />,
  );
}

describe('ConfirmDialog（Modal 基座迁移后）', () => {
  beforeEach(() => {
    okSpy.mockClear();
    cancelSpy.mockClear();
  });

  it('ok/cancel 按钮各自触发回调', () => {
    const { getByText } = renderDialog();
    fireEvent.click(getByText('确认'));
    expect(okSpy).toHaveBeenCalledTimes(1);
    fireEvent.click(getByText('取消'));
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it('backdrop 点击走 onCancel；sheet 内点击不误关', () => {
    const { container } = renderDialog();
    // 基座前两个 Pressable = backdrop / sheet 捕获层（其后才是取消/确认按钮）
    const [backdrop, sheet] = getBasePressables(container);
    // 审查修复 20261025：backdrop 读屏标签 = 取消语义（props 注入，不 import i18n）
    expect(backdrop.getAttribute('data-prop-accessibilitylabel')).toBe('取消');
    fireEvent.click(backdrop);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
    fireEvent.click(sheet);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });
});
