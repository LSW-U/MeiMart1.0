/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from '@testing-library/react';

import { Tabs } from './Tabs';

/** R-P2-17/24：tablist/tab 语义 + 选中态 + onChange + 指示线粗细单源（两套自绘 tab 收编回归钉） */

const TABS = [
  { key: 'new', label: '新任务' },
  { key: 'pickups', label: '待取货' },
] as const;

function attr(el: Element | null, name: string): string | null {
  return (
    el?.getAttribute(`data-prop-${name}`) ??
    el?.getAttribute(`data-prop-${name.toLowerCase()}`) ??
    null
  );
}

describe('Tabs', () => {
  it('容器 tablist / 条目 tab 语义，label 与 selected 透传', () => {
    const { container } = render(<Tabs active="new" tabs={TABS} onChange={() => {}} />);
    expect(container.querySelector('[data-prop-accessibilityrole="tablist"]')).not.toBeNull();
    const tabNodes = container.querySelectorAll('[data-rn-host="Pressable"]');
    expect(tabNodes).toHaveLength(2);
    expect(attr(tabNodes[0], 'accessibilityRole')).toBe('tab');
    expect(attr(tabNodes[0], 'accessibilityLabel')).toBe('新任务');
    expect(attr(tabNodes[0], 'accessibilityState')).toBe(JSON.stringify({ selected: true }));
    expect(attr(tabNodes[1], 'accessibilityState')).toBe(JSON.stringify({ selected: false }));
  });

  it('点 tab 触发 onChange(key)', () => {
    const changeSpy = jest.fn();
    const { getByText } = render(<Tabs active="new" tabs={TABS} onChange={changeSpy} />);
    fireEvent.click(getByText('待取货'));
    expect(changeSpy).toHaveBeenCalledWith('pickups');
  });

  it('指示线统一 h-0.5（R-P2-24 粗细单源）且 tone 激活色生效', () => {
    const lg = render(<Tabs active="new" tabs={TABS} onChange={() => {}} />);
    const indicators = Array.from(
      lg.container.querySelectorAll('[data-rn-host="View"][data-prop-classname]'),
    )
      .map((el) => el.getAttribute('data-prop-classname') ?? '')
      .filter((cls) => cls.includes('h-0.5'));
    expect(indicators).toHaveLength(1);
    expect(indicators[0]).toContain('bg-primary-container');

    const sm = render(
      <Tabs active="new" size="sm" tabs={TABS} tone="primary" onChange={() => {}} />,
    );
    const smText = sm.container.querySelector('[data-rn-host="Text"]');
    const smCls = smText?.getAttribute('data-prop-classname') ?? '';
    expect(smCls).toContain('text-xs');
    expect(smCls).toContain('text-primary');
    expect(smCls).not.toContain('text-primary-container');
  });
});
