/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react';

import { DeliveryProgressBar } from './DeliveryProgressBar';
import { colors } from '../../theme/colors';

/**
 * R-P0-2 审查修复（20261025）配套单测 —— active 圆点色（原 transparent 纯 bug 修复）
 * 与 success 终态第 3 点色（审查修复：与绿字标签同色，不再红绿打架）。
 *
 * web project（jsdom）+ RN host 壳：View 的 inline style 经 data-prop-style（JSON）
 * 断言；连接线也带 backgroundColor，故按颜色值计数而非按下标取节点。
 */

const LABELS = ['取货', '配送', '签收'] as const;

/** 收集所有 View host 的 inline style.backgroundColor（圆点 + 连接线） */
function viewBgColors(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-rn-host="View"]'))
    .map((el) => el.getAttribute('data-prop-style'))
    .filter((s): s is string => Boolean(s))
    .flatMap((s) => {
      try {
        const bg = (JSON.parse(s) as { backgroundColor?: string }).backgroundColor;
        return bg ? [bg] : [];
      } catch {
        return [];
      }
    });
}

describe('DeliveryProgressBar 三态圆点色', () => {
  it('step=1：第 1 点 active 显 primary 红实心，无 done 绿（todo 点无 inline style）', () => {
    const { container } = render(<DeliveryProgressBar labels={[...LABELS]} step={1} />);
    expect(container.querySelector('[data-testid="delivery-progress-bar"]')).not.toBeNull();
    const bgs = viewBgColors(container);
    expect(bgs.filter((c) => c === colors.primary)).toHaveLength(1);
    expect(bgs).not.toContain(colors.success);
  });

  it('step=2：第 1 点 done 绿 + 第 2 点 active 红', () => {
    const { container } = render(<DeliveryProgressBar labels={[...LABELS]} step={2} />);
    const bgs = viewBgColors(container);
    expect(bgs.filter((c) => c === colors.primary)).toHaveLength(1);
    expect(bgs).toContain(colors.success);
  });

  it('success=true：第 3 点与绿字标签同色（success 绿），全条无 primary 红——审查修复回归钉', () => {
    const { container } = render(<DeliveryProgressBar labels={[...LABELS]} step={3} success />);
    const bgs = viewBgColors(container);
    expect(bgs).not.toContain(colors.primary);
    // 三点 + 两条连接线全绿（done×2、active+success 修正×1、线×2）
    expect(bgs.filter((c) => c === colors.success)).toHaveLength(5);
    // 第 3 个标签（Text host）inline style 也为 success 绿
    const label3 = Array.from(container.querySelectorAll('[data-rn-host="Text"]')).find(
      (el) => el.textContent === LABELS[2],
    );
    expect(label3?.getAttribute('data-prop-style')).toContain(colors.success);
  });
});
