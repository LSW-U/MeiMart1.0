/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';

import { showToast } from '../../../src/components/feedback/Toast';
import type { WithdrawalSubmit } from '../../../src/types/earnings';

import WithdrawalPage from '../../../app/earnings/withdraw';

/**
 * WithdrawalPage 单测 —— 批1 T6（D10）真实接线版（原 E2 占位态测试随 FORCE_MOCK 退役重写）。
 *
 * 覆盖：
 *   ① payout channel 四选一 radio a11y（accessibilityState.checked 切换）
 *   ② account 必填：空 account 提交禁用；填入后解锁
 *   ③ E-SETTLE-001（ApiError.code）→ showToast(exceedsBalance, error)；
 *      无 message → networkError；其余 → failed
 *   ④ 提交 payload：amount 美元数值 + channel + account（bank 字段仅 BANK_TRANSFER 带出）
 *   ⑤ 全部提现填入 availableBalance.toFixed(2) + 小数位过滤
 *   ⑥ 成功 toast + 800ms 跳转
 *
 * 桩法与 tasks/earnings.test.tsx 同源（web project + RN host 壳）。
 * mock 变量名前缀 mock*（jest factory 白名单要求）。
 */

const showToastMock = showToast as jest.Mock;
const mockMutateAsync = jest.fn();
const mockRouterReplace = jest.fn();

let mockAvailableBalance = 128.5;

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockRouterReplace,
    back: jest.fn(),
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('../../../src/services/queries/useSettings', () => ({
  useRiderSettings: () => ({ data: { dutyStatus: 'onDuty', language: 'zh' } }),
}));

jest.mock('../../../src/services/queries/useEarnings', () => ({
  useEarningSummary: () => ({
    data: {
      availableBalance: mockAvailableBalance,
      todayEarnings: 24.5,
      weeklyEarnings: 186,
      monthlyEarnings: 720,
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useEarningTransactions: () => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useCreateWithdrawal: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

jest.mock('../../../src/hooks/useGoBack', () => ({
  useGoBack: () => jest.fn(),
}));

jest.mock('../../../src/components/feedback/Toast', () => ({
  showToast: jest.fn(),
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<WithdrawalPage />, { wrapper });
}

/** 按 testID 找 TextInput host 壳节点（透传 __fnProps/value） */
function findInput(container: HTMLElement, testId: string): HTMLElement {
  const el = container.querySelector(`[data-testid="${testId}"]`);
  if (!el) throw new Error(`input not found: ${testId}`);
  return el as unknown as HTMLElement;
}

function typeInput(container: HTMLElement, testId: string, value: string): void {
  const input = findInput(container, testId) as unknown as {
    __fnProps: { onChangeText: (v: string) => void };
  };
  act(() => {
    input.__fnProps.onChangeText(value);
  });
}

function readInputValue(container: HTMLElement, testId: string): string {
  return findInput(container, testId).getAttribute('data-prop-value') ?? '';
}

/** 填好合法表单（金额 + account），返回后可直接点提交 */
function fillValidForm(container: HTMLElement, amount = '50'): void {
  typeInput(container, 'withdraw-amount-input', amount);
  typeInput(container, 'withdraw-account-input', 'TL 1234567890');
}

beforeEach(() => {
  showToastMock.mockClear();
  mockMutateAsync.mockReset();
  mockRouterReplace.mockClear();
  mockAvailableBalance = 128.5;
});

describe('payout channel 四选一（批1 T6 D10）', () => {
  it('四个渠道 radio 就位，默认选中 BANK_TRANSFER', () => {
    const { container } = renderPage();
    const radios = container.querySelectorAll('[data-prop-accessibilityrole="radio"]');

    expect(radios.length).toBe(4);
    expect(radios[0].getAttribute('data-prop-accessibilitystate')).toContain('"checked":true');
    expect(radios[1].getAttribute('data-prop-accessibilitystate')).toContain('"checked":false');
  });

  it('点击 WECHAT 行：checked 切到 WECHAT', () => {
    const { container, getByText } = renderPage();

    fireEvent.click(getByText('微信'));
    const radios = container.querySelectorAll('[data-prop-accessibilityrole="radio"]');
    expect(radios[0].getAttribute('data-prop-accessibilitystate')).toContain('"checked":false');
    expect(radios[1].getAttribute('data-prop-accessibilitystate')).toContain('"checked":true');
  });

  it('BANK_TRANSFER 选中时显示银行名/支行输入，切 WECHAT 后隐藏', () => {
    const { container, getByText } = renderPage();

    expect(findInput(container, 'withdraw-bankname-input')).toBeTruthy();
    expect(findInput(container, 'withdraw-branch-input')).toBeTruthy();

    fireEvent.click(getByText('微信'));
    expect(container.querySelector('[data-testid="withdraw-bankname-input"]')).toBeNull();
    expect(container.querySelector('[data-testid="withdraw-branch-input"]')).toBeNull();
  });
});

describe('account 必填门禁（批1 T6 D10）', () => {
  it('account 为空时提交禁用（amount 已填仍禁）', () => {
    const { container, getByText } = renderPage();
    typeInput(container, 'withdraw-amount-input', '50');

    const btn = getByText('确认提现').closest('[data-prop-accessibilityrole="button"]');
    // Button 组件 disabled 透传为 accessibilityState.disabled 或 disabled prop；以点击不触发为准
    fireEvent.click(getByText('确认提现'));
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(btn).toBeTruthy();
  });

  it('填入 account 后提交解锁，mutateAsync 收到完整 WithdrawalSubmit', async () => {
    mockMutateAsync.mockResolvedValueOnce(undefined);
    const { container, getByText } = renderPage();
    fillValidForm(container, '50');

    fireEvent.click(getByText('确认提现'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });
    const payload = mockMutateAsync.mock.calls[0][0] as WithdrawalSubmit;
    expect(payload.amount).toBe(50);
    expect(payload.channel).toBe('BANK_TRANSFER');
    expect(payload.account).toBe('TL 1234567890');
  });

  it('account 带首尾空格：payload 里 trim 后提交', async () => {
    mockMutateAsync.mockResolvedValueOnce(undefined);
    const { container, getByText } = renderPage();
    typeInput(container, 'withdraw-amount-input', '20');
    typeInput(container, 'withdraw-account-input', '  ACC-9  ');

    fireEvent.click(getByText('确认提现'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
    expect((mockMutateAsync.mock.calls[0][0] as WithdrawalSubmit).account).toBe('ACC-9');
  });
});

describe('金额交互（沿用 E2 §3.4/§3.5）', () => {
  it('点击「全部提现」填入可用余额（128.50）', () => {
    const { getByText, container } = renderPage();

    fireEvent.click(getByText('全部提现'));
    expect(readInputValue(container, 'withdraw-amount-input')).toBe('128.50');
  });

  it('输入 1.234 截断为 1.23', () => {
    const { container } = renderPage();

    typeInput(container, 'withdraw-amount-input', '1.234');
    expect(readInputValue(container, 'withdraw-amount-input')).toBe('1.23');
  });
});

describe('错误反馈 toast（批1 T6：ApiError.code 映射）', () => {
  it('E-SETTLE-001（余额不足）→ showToast(exceedsBalance, error)', async () => {
    mockMutateAsync.mockRejectedValueOnce({ code: 'E-SETTLE-001', message: 'insufficient' });
    const { container, getByText } = renderPage();
    fillValidForm(container, '120');

    fireEvent.click(getByText('确认提现'));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('提现金额超出可用余额', 'error');
    });
  });

  it('无 message 的错误 → showToast(common.networkError, error)', async () => {
    mockMutateAsync.mockRejectedValueOnce({ code: 'E-NET' });
    const { container, getByText } = renderPage();
    fillValidForm(container, '50');

    fireEvent.click(getByText('确认提现'));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('网络异常，请重试', 'error');
    });
  });

  it('其他错误 → showToast(withdraw.failed, error)', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('something unexpected'));
    const { container, getByText } = renderPage();
    fillValidForm(container, '50');

    fireEvent.click(getByText('确认提现'));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('提现失败', 'error');
    });
  });
});

describe('成功提交（E2 §3.3）', () => {
  it('成功 → showToast(success) + 800ms 后跳转 earnings', async () => {
    mockMutateAsync.mockResolvedValueOnce(undefined);
    const { container, getByText } = renderPage();
    fillValidForm(container, '50');

    fireEvent.click(getByText('确认提现'));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('提现申请已提交', 'success');
    });
    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith('/(main)/earnings');
    });
  });

  it('非 BANK_TRANSFER 渠道：bankName/branchName 不进 payload', async () => {
    mockMutateAsync.mockResolvedValueOnce(undefined);
    const { container, getByText } = renderPage();

    fireEvent.click(getByText('微信'));
    fillValidForm(container, '30');

    fireEvent.click(getByText('确认提现'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
    const payload = mockMutateAsync.mock.calls[0][0] as WithdrawalSubmit;
    expect(payload.channel).toBe('WECHAT');
    expect(payload.bankName).toBeUndefined();
    expect(payload.branchName).toBeUndefined();
  });
});
