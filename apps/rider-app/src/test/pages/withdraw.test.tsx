/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';

import { showToast } from '../../../src/components/feedback/Toast';

import WithdrawalPage from '../../../app/earnings/withdraw';

/**
 * WithdrawalPage 单测 —— E2：提现页错误反馈与假数据治理。
 *
 * 覆盖拍板（E2 方案 §3）：
 *   ①A 删 i18n 假数据 → 占位态（unboundCard/unboundServicePoint warn-text）
 *   ②A cash 图标（hand-coin-outline，icon mock testID）
 *   ③A 错误 → toast + i18n e.message 字符串映射（3 态）
 *   ④A 全部提现按钮（填入 availableBalance.toFixed(2)）
 *   + §3.4 小数位过滤（1.234 → 1.23）
 *   + §3.6 radio a11y（accessibilityState.checked）
 *
 * 桩法与 tasks/earnings.test.tsx 同源（web project + RN host 壳）：
 *   - useEarningSummary：mockSummaryState 切余额场景（默认 128.5）
 *   - useCreateWithdrawal：mockMutateAsync 控制成功/reject（reject 按 message 走 3 态映射）
 *   - showToast：mock 模块取 spy（ToastHost 不挂载，断言调用参数而非渲染）
 *   - useGoBack / expo-router：页面测试不关心导航
 * mock 变量名前缀 mock*（jest factory 白名单要求）。
 */

const showToastMock = showToast as jest.Mock;
const mockMutateAsync = jest.fn();
const mockRouterReplace = jest.fn();

let mockAvailableBalance = 128.5;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockRouterReplace, back: jest.fn(), canGoBack: () => true }),
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
    data: { availableBalance: mockAvailableBalance, todayEarnings: 24.5, weeklyEarnings: 186, monthlyEarnings: 720 },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useEarningTransactions: () => ({ data: [], isLoading: false, isError: false, refetch: jest.fn() }),
  useCreateWithdrawal: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

jest.mock('../../../src/hooks/useGoBack', () => ({
  useGoBack: () => jest.fn(),
}));

jest.mock('../../../src/components/feedback/Toast', () => ({
  showToast: jest.fn(),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<WithdrawalPage />, { wrapper });
}

/** 取金额输入框的 onChangeText（host 壳经 __fnProps 透传函数 prop） */
function getAmountOnChange(container: HTMLElement): (v: string) => void {
  const input = container.querySelector('[data-rn-host="TextInput"]') as unknown as {
    __fnProps: { onChangeText: (v: string) => void };
  };
  return input.__fnProps.onChangeText;
}

/** 金额输入框填值后回读 data-prop-value（host 壳透传 value） */
function readAmountValue(container: HTMLElement): string {
  return container.querySelector('[data-rn-host="TextInput"]')?.getAttribute('data-prop-value') ?? '';
}

beforeEach(() => {
  showToastMock.mockClear();
  mockMutateAsync.mockReset();
  mockRouterReplace.mockClear();
  mockAvailableBalance = 128.5;
});

describe('占位态渲染（E2 §3.1 ①A 删假数据）', () => {
  it('银行卡行显示「未绑定银行卡」占位（warn-text，非假卡号）', () => {
    const { container, getAllByText, queryByText } = renderPage();

    // 占位文案出现在「子文案」+「绑定入口」两处（同名），断言 ≥1 且无假卡号
    expect(getAllByText('未绑定银行卡').length).toBeGreaterThanOrEqual(1);
    expect(queryByText(/\*{4}/)).toBeNull();
    // warn-text token：占位态子文案走 warning 语义
    const hosts = container.querySelectorAll('[data-rn-host="Text"]');
    const classes = Array.from(hosts).map((el) => el.getAttribute('data-prop-classname') ?? '');
    expect(classes.some((c) => c.includes('text-warn-text'))).toBe(true);
  });

  it('现金行显示「未选择服务网点」占位 + cash 图标（②A hand-coin-outline）', () => {
    const { container, queryByText } = renderPage();

    expect(queryByText('未选择服务网点')).toBeTruthy();
    // cash 图标节点存在（icon mock 壳以 Material 名渲染 testID）
    expect(container.querySelector('[data-testid="icon-hand-coin-outline"]')).not.toBeNull();
    // bank 图标同就位
    expect(container.querySelector('[data-testid="icon-bank-outline"]')).not.toBeNull();
  });

  it('绑定入口：虚线边框 + plus 图标 + primary 文案（W6+ 占位）', () => {
    const { container, getAllByText } = renderPage();

    expect(getAllByText('未绑定银行卡').length).toBeGreaterThanOrEqual(1);
    expect(container.querySelector('[data-testid="icon-plus"]')).not.toBeNull();
    // 虚线边框 token
    const hosts = container.querySelectorAll('[data-rn-host="Pressable"]');
    const classes = Array.from(hosts).map((el) => el.getAttribute('data-prop-classname') ?? '');
    expect(classes.some((c) => c.includes('border-dashed'))).toBe(true);
  });
});

describe('全部提现按钮（E2 §3.5 ④A）', () => {
  it('点击「全部提现」填入可用余额（保留 2 位小数）', () => {
    const { getByText, container } = renderPage();

    fireEvent.click(getByText('全部提现'));
    // 金额输入框 value 变为 128.50
    expect(readAmountValue(container)).toBe('128.50');
  });
});

describe('小数位过滤（E2 §3.4）', () => {
  it('输入 1.234 截断为 1.23（小数点后最多 2 位）', () => {
    const { container } = renderPage();

    act(() => {
      getAmountOnChange(container)('1.234');
    });
    expect(readAmountValue(container)).toBe('1.23');
  });

  it('输入 100 正常保留（无小数合法）', () => {
    const { container } = renderPage();

    act(() => {
      getAmountOnChange(container)('100');
    });
    expect(readAmountValue(container)).toBe('100');
  });
});

describe('radio a11y（E2 §3.6）', () => {
  it('默认选中 bank：bank radio checked、cash radio unchecked', () => {
    const { container } = renderPage();
    const radios = container.querySelectorAll('[data-prop-accessibilityrole="radio"]');

    expect(radios.length).toBe(2);
    expect(radios[0].getAttribute('data-prop-accessibilitystate')).toContain('"checked":true');
    expect(radios[1].getAttribute('data-prop-accessibilitystate')).toContain('"checked":false');
  });

  it('点击现金行：checked 切到 cash', () => {
    const { container, getByText } = renderPage();

    fireEvent.click(getByText('服务网点现金领取'));
    const radios = container.querySelectorAll('[data-prop-accessibilityrole="radio"]');
    expect(radios[0].getAttribute('data-prop-accessibilitystate')).toContain('"checked":false');
    expect(radios[1].getAttribute('data-prop-accessibilitystate')).toContain('"checked":true');
  });
});

describe('错误反馈 toast（E2 §3.2 ③A e.message 字符串映射）', () => {
  it('余额不足（Insufficient balance）→ showToast(exceedsBalance, error)', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('Insufficient balance'));
    const { container, getByText } = renderPage();

    // 余额 128.5；提现 120（不超额，提交不被本地 exceedsBalance 守卫挡掉，走 mutateAsync reject 路径）
    act(() => {
      getAmountOnChange(container)('120');
    });
    fireEvent.click(getByText('确认提现'));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('提现金额超出可用余额', 'error');
    });
  });

  it('端点不可用（not available）→ showToast(common.networkError, error)', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('rider withdraw endpoint not available (W6+)'));
    const { container, getByText } = renderPage();

    act(() => {
      getAmountOnChange(container)('50');
    });
    fireEvent.click(getByText('确认提现'));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('网络异常，请重试', 'error');
    });
  });

  it('其他错误 → showToast(withdraw.failed, error)', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('something unexpected'));
    const { container, getByText } = renderPage();

    act(() => {
      getAmountOnChange(container)('50');
    });
    fireEvent.click(getByText('确认提现'));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('提现失败', 'error');
    });
  });
});

describe('成功 toast（E2 §3.3）', () => {
  it('提交成功 → showToast(withdraw.success, success) + 跳转', async () => {
    mockMutateAsync.mockResolvedValueOnce(undefined);
    const { container, getByText } = renderPage();

    act(() => {
      getAmountOnChange(container)('50');
    });
    fireEvent.click(getByText('确认提现'));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('提现申请已提交', 'success');
    });
    // 800ms 后跳转
    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith('/(main)/earnings');
    });
  });
});
