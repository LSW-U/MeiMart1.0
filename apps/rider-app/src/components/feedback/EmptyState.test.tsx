/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from '@testing-library/react';

import { EmptyState } from './EmptyState';

/** R-P2-21：icon + CTA 能力（缺省保持旧纯文本形态，既有调用方零影响） */
describe('EmptyState', () => {
  it('缺省不渲染图标与 CTA（既有调用方零影响）', () => {
    const { container, getByText } = render(<EmptyState title="暂无任务" />);
    expect(getByText('暂无任务')).toBeTruthy();
    expect(container.querySelector('[data-testid]')).toBeNull();
    expect(container.querySelectorAll('[data-rn-host="Pressable"]')).toHaveLength(0);
  });

  it('iconName 渲染图标；CTA 点击触发 onAction', () => {
    const actionSpy = jest.fn();
    const { container, getByText } = render(
      <EmptyState actionLabel="切换状态" iconName="orders" title="暂无任务" onAction={actionSpy} />,
    );
    // AppIcon mock 的 testID 用 Material 图标名（orders → clipboard-list-outline）
    expect(container.querySelector('[data-testid="icon-clipboard-list-outline"]')).not.toBeNull();
    fireEvent.click(getByText('切换状态'));
    expect(actionSpy).toHaveBeenCalledTimes(1);
  });
});
