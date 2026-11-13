/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from '@testing-library/react';

import { getBaseViews } from '../../test/rn-host-utils';
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
    // 修复 20261027：web 分支基座 backdrop/sheet 改 View（消除 button 嵌套），前两个 View host
    const [backdrop, sheet] = getBaseViews(container);
    fireEvent.click(backdrop);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
    fireEvent.click(sheet);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });
});
