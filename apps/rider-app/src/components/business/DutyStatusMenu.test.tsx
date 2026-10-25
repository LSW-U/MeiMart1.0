/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from '@testing-library/react';

import { getBasePressables } from '../../test/rn-host-utils';
import type { DutyStatus } from '../../services/settings';
import { DutyStatusMenu } from './DutyStatusMenu';

/**
 * R-P1-13 迁移回归：DutyStatusMenu（切班核心控件）走 Modal 基座后交互契约不回归
 * ——选项点击 onPick、backdrop/取消 onClose、sheet 内点击不误关。
 */

jest.mock('../../i18n/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const pickSpy = jest.fn();
const closeSpy = jest.fn();

const OPTIONS: { value: DutyStatus; label: string }[] = [
  { value: 'onDuty', label: '接单中' },
  { value: 'busy', label: '忙碌' },
  { value: 'offDuty', label: '已下班' },
];

function renderMenu() {
  return render(
    <DutyStatusMenu
      cancelLabel="取消"
      current="onDuty"
      options={OPTIONS}
      title="切换班次"
      visible
      onClose={closeSpy}
      onPick={pickSpy}
    />,
  );
}

describe('DutyStatusMenu（Modal 基座迁移后）', () => {
  beforeEach(() => {
    pickSpy.mockClear();
    closeSpy.mockClear();
  });

  it('渲染标题与全部选项，选项点击触发 onPick', () => {
    const { getByText } = renderMenu();
    expect(getByText('切换班次')).toBeTruthy();
    fireEvent.click(getByText('忙碌'));
    expect(pickSpy).toHaveBeenCalledWith('busy');
  });

  it('backdrop 与取消按钮都走 onClose；sheet 空白区点击不误关', () => {
    const { container, getByText } = renderMenu();
    // 基座前两个 Pressable = backdrop / sheet 捕获层（具名访问见 rn-host-utils）
    const [backdrop, sheet] = getBasePressables(container);
    fireEvent.click(sheet);
    expect(closeSpy).not.toHaveBeenCalled();
    fireEvent.click(backdrop);
    expect(closeSpy).toHaveBeenCalledTimes(1);
    fireEvent.click(getByText('取消'));
    expect(closeSpy).toHaveBeenCalledTimes(2);
  });
});
