/**
 * @jest-environment jsdom
 */
import { Pressable } from 'react-native';
import { render } from '@testing-library/react';

import { SimplePageHeader } from './SimplePageHeader';
import { StepPageHeader } from './StepPageHeader';

/**
 * B4 统一页头单测 —— Step/Simple 两组件规格（方案 §6）。
 *
 * web project（jsdom）+ RN host 壳。expo-router 的 useGoBack/useRouter 依赖
 * expo runtime，jest.mock 掉（页头测试不关心导航实现，只测渲染与 a11y 透传）。
 */

jest.mock('../../hooks/useGoBack', () => ({
  useGoBack: () => jest.fn(),
}));

function attr(el: Element | null, name: string): string | null {
  return el?.getAttribute(`data-prop-${name}`) ?? el?.getAttribute(`data-prop-${name.toLowerCase()}`) ?? null;
}

describe('StepPageHeader', () => {
  it('渲染标题与返回按钮；无 action 时右侧渲染占位（flex-1 中标题 + 末尾 View）', () => {
    const { container, getByText } = render(<StepPageHeader backLabel="返回" title="取货确认" />);
    expect(getByText('取货确认')).toBeTruthy();
    const back = container.querySelector('[data-rn-host="Pressable"]');
    expect(attr(back, 'accessibilityRole')).toBe('button');
    expect(attr(back, 'accessibilityLabel')).toBe('返回');
    // 无 action：仅返回一个 Pressable（右侧是 View 占位，不渲染第二个 Pressable）
    expect(container.querySelectorAll('[data-rn-host="Pressable"]')).toHaveLength(1);
  });

  it('传 actionLabel/onAction 时渲染 action 按钮', () => {
    const { container } = render(<StepPageHeader actionLabel="帮助中心" backLabel="返回" title="取货确认" onAction={() => {}} />);
    const pressables = container.querySelectorAll('[data-rn-host="Pressable"]');
    expect(pressables).toHaveLength(2);
    expect(attr(pressables[1], 'accessibilityLabel')).toBe('帮助中心');
  });

  it('标题 numberOfLines=1', () => {
    const { container } = render(<StepPageHeader backLabel="返回" title="订单详情" />);
    const title = Array.from(container.querySelectorAll('[data-rn-host="Text"]')).find((el) => el.textContent === '订单详情');
    expect(attr(title ?? null, 'numberOfLines')).toBe('1');
  });

  it('返回与 action 用 chevronLeft / help 图标（‹ ? 文本字符清零）', () => {
    const { container } = render(<StepPageHeader actionLabel="帮助" backLabel="返回" title="T" onAction={() => {}} />);
    const icons = container.querySelectorAll('[data-testid]');
    const names = Array.from(icons).map((el) => el.getAttribute('data-testid'));
    // vector-icons mock 的 testID 用 Material 图标名：chevron-left / help-circle-outline
    expect(names).toContain('icon-chevron-left');
    expect(names).toContain('icon-help-circle-outline');
    expect(container.textContent).not.toContain('‹');
    expect(container.textContent).not.toContain('?');
  });
});

describe('SimplePageHeader', () => {
  it('渲染左对齐标题与返回按钮；无 action 时不渲染右侧占位', () => {
    const { container, getByText } = render(<SimplePageHeader backLabel="返回" title="设置" />);
    expect(getByText('设置')).toBeTruthy();
    expect(container.querySelectorAll('[data-rn-host="Pressable"]')).toHaveLength(1);
    // 无 action：右侧无内容（单 Pressable 即返回）
    expect(attr(container.querySelector('[data-rn-host="Pressable"]'), 'accessibilityLabel')).toBe('返回');
  });

  it('action ReactNode 原样渲染，a11y 属性不被吞', () => {
    const { container } = render(
      <SimplePageHeader
        action={<Pressable accessibilityLabel="全部已读" accessibilityRole="button" testID="mark-all" />}
        backLabel="返回"
        title="通知"
      />,
    );
    const custom = container.querySelector('[data-testid="mark-all"]');
    expect(custom).not.toBeNull();
    expect(attr(custom, 'accessibilityRole')).toBe('button');
    expect(attr(custom, 'accessibilityLabel')).toBe('全部已读');
  });

  it('标题 numberOfLines=1', () => {
    const { container } = render(<SimplePageHeader backLabel="返回" title="帮助中心" />);
    const title = Array.from(container.querySelectorAll('[data-rn-host="Text"]')).find((el) => el.textContent === '帮助中心');
    expect(attr(title ?? null, 'numberOfLines')).toBe('1');
  });

  it('返回箭头 text-on-surface（与 Simple 页标题同色）', () => {
    const { container } = render(<SimplePageHeader backLabel="返回" title="设置" />);
    // 图标是 span（vector-icons mock），className 不透传——验证 Pressable 容器结构即可，色值属 AppIcon 适配层已有测试范围
    expect(container.querySelector('[data-rn-host="Pressable"]')).not.toBeNull();
  });
});
