/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react';
import { type ReactNode } from 'react';

import { DepositBlockDialog } from './DepositBlockDialog';

/**
 * DepositBlockDialog 单测 —— 批B B1：保证金拦截弹窗抽公共组件。
 *
 * web project（jsdom）+ RN host 壳（react-native moduleNameMapper）。
 * 覆盖任务书 B1 验收线「跳转目标断言 ≥3（含两分支）」：
 *   - unpaid 分支：主 CTA「前往缴纳」回调（tasks.tsx / task/[id].tsx 均接
 *     router.push('/settings/deposit/pay')）+「稍后」dismiss
 *   - pending 分支：「查看申请」回调（跳 records）+「知道了」dismiss + 金额插值
 *   - visible=false 不渲染（调用方 depositBlocked/dismissed 状态门控）
 * 跳转目标由调用方接线（router.push），组件只出回调——回调被触发即跳转链路成立，
 * 调用方侧跳转目标断言在 tasks.test.tsx / task-detail.test.tsx（router.push spy）。
 */

const onGoDeposit = jest.fn();
const onViewRequest = jest.fn();
const onDismiss = jest.fn();

// 组件内部 useTranslation → useRiderSettings（RQ hook），需 QueryClientProvider 包裹
function renderDialog(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(ui, { wrapper });
}

beforeEach(() => {
  onGoDeposit.mockClear();
  onViewRequest.mockClear();
  onDismiss.mockClear();
});

describe('unpaid 分支（未缴保证金）', () => {
  it('渲染标题与主 CTA「前往缴纳」，点击触发 onGoDeposit（→ pay 缴款页）', () => {
    const { getByText } = renderDialog(
      <DepositBlockDialog
        reason="unpaid"
        visible
        onDismiss={onDismiss}
        onGoDeposit={onGoDeposit}
      />,
    );

    expect(getByText('需要缴纳保证金')).toBeTruthy();
    expect(getByText('前往缴纳')).toBeTruthy();
    // unpaid 分支不渲染 pending 文案（两分支互斥）
    expect(() => getByText('保证金待确认')).toThrow();

    fireEvent.click(getByText('前往缴纳'));
    expect(onGoDeposit).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('「稍后」触发 onDismiss（tasks 页 dismissed 后本会话不再弹）', () => {
    const { getByText } = renderDialog(
      <DepositBlockDialog
        reason="unpaid"
        visible
        onDismiss={onDismiss}
        onGoDeposit={onGoDeposit}
      />,
    );

    fireEvent.click(getByText('稍后'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onGoDeposit).not.toHaveBeenCalled();
  });
});

describe('pending 分支（已提交待确认）', () => {
  it('渲染「查看申请」CTA，点击触发 onViewRequest（→ records 记录页）', () => {
    const { getByText } = renderDialog(
      <DepositBlockDialog
        pendingAmount="$5.00"
        reason="pending"
        visible
        onDismiss={onDismiss}
        onGoDeposit={onGoDeposit}
        onViewRequest={onViewRequest}
      />,
    );

    expect(getByText('保证金待确认')).toBeTruthy();
    // pendingMessage 金额插值（{amount} 单大括号 rider 插值风格）
    expect(getByText(/您已提交 \$5\.00 缴纳申请/)).toBeTruthy();

    fireEvent.click(getByText('查看申请'));
    expect(onViewRequest).toHaveBeenCalledTimes(1);
    expect(onGoDeposit).not.toHaveBeenCalled();
  });

  it('「知道了」触发 onDismiss；未传 onViewRequest 时 CTA 降级隐藏（防御）', () => {
    const { getByText, queryByText } = renderDialog(
      <DepositBlockDialog
        pendingAmount="$5.00"
        reason="pending"
        visible
        onDismiss={onDismiss}
        onGoDeposit={onGoDeposit}
      />,
    );

    expect(queryByText('查看申请')).toBeNull();
    fireEvent.click(getByText('知道了'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('visible 门控', () => {
  it('visible=false 不渲染（调用方 dismiss/depositBlockReason 状态控制）', () => {
    const { queryByText } = renderDialog(
      <DepositBlockDialog
        reason="unpaid"
        visible={false}
        onDismiss={onDismiss}
        onGoDeposit={onGoDeposit}
      />,
    );

    expect(queryByText('需要缴纳保证金')).toBeNull();
  });
});

describe('tierLimit 分支（P3-1：已缴但本单金额超档位上限，E-DEPOSIT-202）', () => {
  it('渲染档位上限标题/正文（非 unpaid 文案），CTA 同为「前往缴纳」跳缴款页', () => {
    const { getByText, queryByText } = renderDialog(
      <DepositBlockDialog
        reason="tierLimit"
        visible
        onDismiss={onDismiss}
        onGoDeposit={onGoDeposit}
      />,
    );

    // 202 专属文案（已缴骑手不再看到「需要缴纳保证金」矛盾标题）
    expect(getByText('当前档位上限不足')).toBeTruthy();
    expect(getByText(/本单金额超出当前档位可接上限/)).toBeTruthy();
    expect(queryByText('需要缴纳保证金')).toBeNull();
    // CTA 结构复用 unpaid：前往缴纳 + 稍后
    expect(getByText('前往缴纳')).toBeTruthy();
    expect(getByText('稍后')).toBeTruthy();

    fireEvent.click(getByText('前往缴纳'));
    expect(onGoDeposit).toHaveBeenCalledTimes(1);
  });
});
