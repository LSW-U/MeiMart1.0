/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor, type RenderResult } from '@testing-library/react';
import { type ReactNode } from 'react';

import { showToast } from '../../../src/components/feedback/Toast';

import DepositPayPage from '../../../app/settings/deposit/pay';

/**
 * DepositPayPage 单测 —— 批 H 拍板 6/7：独立缴纳子页 /settings/deposit/pay。
 *
 * 覆盖：
 *   - 页头「‹ 保证金」+ 标题「缴纳保证金」（拍板 7 返回语义）
 *   - Tab summary 双通道切换（线上「即时生效」/ 线下「需 admin 确认」，拍板 7）
 *   - 金额校验：非法 / < $1 → inline error + 预览「—」+ 提交禁用，不保留旧金额（§6.1）
 *   - resubmitAmount / presetAmount 预填联动
 *   - COD 缴纳点：选中 radio / 未选提交 toast / 列表 error+重试 / empty（§8.2）
 *   - 线上 mock 支付两步成功 → toast + router.back；失败 → e.message toast
 *   - tiers error → 档位信息暂不可用 + 重试（§6.2）
 *
 * 桩法与 withdraw.test.tsx 同源（web project + RN host 壳，TextInput 经
 * __fnProps 直调 onChangeText / data-prop-value 回读）。
 */

const showToastMock = showToast as jest.Mock;
const mockRouterBack = jest.fn();
const mockCreateAsync = jest.fn();
const mockPayMockAsync = jest.fn();
const mockTiersRefetch = jest.fn();
const mockLocationsRefetch = jest.fn();
const mockCreatePending = { value: false };

const TIERS = [
  { id: 't1', minAmount: 100, maxOrderAmount: 10000, sortOrder: 1, enabled: true },
  { id: 't2', minAmount: 5000, maxOrderAmount: 50000, sortOrder: 2, enabled: true },
  { id: 't3', minAmount: 10000, maxOrderAmount: null, sortOrder: 3, enabled: true },
];

const LOCATIONS = [
  { id: 'loc1', name: 'Dili 服务中心', address: 'Dili 大街 1 号', note: null, enabled: true },
  { id: 'loc2', name: 'Baucau 网点', address: 'Baucau 路 2 号', note: null, enabled: true },
];

let mockParams: Record<string, string> = {};
let mockLocationsQ: {
  data: typeof LOCATIONS | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};
let mockTiersQ: {
  data: typeof TIERS | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockRouterBack }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('../../../src/hooks/useGoBack', () => ({
  useGoBack: () => jest.fn(),
}));

jest.mock('../../../src/services/queries/useSettings', () => ({
  useRiderSettings: () => ({ data: { language: 'zh' } }),
}));

jest.mock('../../../src/services/queries/useDeposit', () => ({
  useDepositStatus: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useCreateDepositRequest: () => ({
    mutateAsync: mockCreateAsync,
    isPending: mockCreatePending.value,
  }),
  usePayMockDeposit: () => ({ mutateAsync: mockPayMockAsync, isPending: false }),
  useDepositLocations: () => mockLocationsQ,
  useDepositTiers: () => mockTiersQ,
}));

jest.mock('../../../src/components/feedback/Toast', () => ({
  showToast: jest.fn(),
}));

function renderPage(): RenderResult {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<DepositPayPage />, { wrapper });
}

function getAmountInput(container: HTMLElement): {
  onChange: (v: string) => void;
  value: string;
} {
  // 原因：query selector 返回 Element，需取测试 host 壳挂在节点的 __fnProps（非标准 DOM 属性）
  const input = container.querySelector('[data-rn-host="TextInput"]') as unknown as {
    __fnProps: { onChangeText: (v: string) => void };
  };
  return {
    onChange: input.__fnProps.onChangeText,
    value:
      container.querySelector('[data-rn-host="TextInput"]')?.getAttribute('data-prop-value') ?? '',
  };
}

function findPressableByText(getByText: (s: string) => HTMLElement, text: string): HTMLElement {
  return getByText(text).closest('[data-rn-host="Pressable"]') as HTMLElement;
}

beforeEach(() => {
  showToastMock.mockClear();
  mockRouterBack.mockClear();
  mockCreateAsync.mockReset();
  mockPayMockAsync.mockReset();
  mockTiersRefetch.mockReset();
  mockLocationsRefetch.mockReset();
  mockCreatePending.value = false;
  mockParams = {};
  mockLocationsQ = {
    data: LOCATIONS,
    isLoading: false,
    isError: false,
    refetch: mockLocationsRefetch,
  };
  mockTiersQ = { data: TIERS, isLoading: false, isError: false, refetch: mockTiersRefetch };
});

describe('页头与 Tab summary（拍板 6 + 7）', () => {
  it('标题「缴纳保证金」+ 返回「‹ 保证金」+ 默认线上 summary', () => {
    const { getByText, container } = renderPage();

    expect(getByText('缴纳保证金')).toBeTruthy();
    // 返回语义：backLabel 是 header 返回钮的 accessibilityLabel
    const backBtn = container.querySelector('[data-rn-host="Pressable"]');
    expect(backBtn?.getAttribute('data-prop-accessibilitylabel')).toBe('保证金');
    expect(getByText('线上支付即时生效')).toBeTruthy();
  });

  it('切线下 Tab → summary 换「线下缴纳需 admin 确认」+ 缴纳点 radio 列表', () => {
    const { getByText } = renderPage();

    fireEvent.click(findPressableByText(getByText, '线下 COD'));
    expect(getByText('线下缴纳需 admin 确认')).toBeTruthy();
    expect(getByText('Dili 服务中心')).toBeTruthy();
    expect(getByText('Baucau 网点')).toBeTruthy();
    // COD warning + 流程提示
    expect(getByText('⚠ 提交后状态为「待确认」，需 admin 现场确认后才生效')).toBeTruthy();
    expect(getByText('提交 → 待确认 → admin 确认 → 生效')).toBeTruthy();
  });
});

describe('金额校验（方案 §6.1）', () => {
  it('默认选中 $50 chip：预览 $50.00 + 提交按钮带金额', () => {
    const { getByText } = renderPage();

    expect(getByText('当前缴纳金额')).toBeTruthy();
    expect(getByText('$50.00')).toBeTruthy();
    expect(getByText('确认缴纳 $50.00')).toBeTruthy();
  });

  it('自定义金额 < $1 → 「最低缴纳 $1」+ 预览「—」+ 提交禁用（不保留旧金额）', () => {
    const { getByText, container } = renderPage();

    act(() => {
      getAmountInput(container).onChange('0.5');
    });
    expect(getByText('最低缴纳 $1')).toBeTruthy();
    expect(getByText('—')).toBeTruthy();
    // 提交禁用（§7：金额无效 → disabled）+ 文案落回「确认缴纳」
    // host 壳把 disabled 解构出 rest（无 data-prop-disabled），禁用语义用点击阻断断言
    const submit = findPressableByText(getByText, '确认缴纳');
    fireEvent.click(submit);
    expect(mockCreateAsync).not.toHaveBeenCalled();
  });

  it('非法输入（三位小数）→ 「请输入有效的缴纳金额」', () => {
    const { getByText, container } = renderPage();

    act(() => {
      getAmountInput(container).onChange('1.234');
    });
    expect(getByText('请输入有效的缴纳金额')).toBeTruthy();
  });

  it('合法自定义金额 $25 → 预览 $25.00 + 档位提示联动（$50 档）', () => {
    const { getByText, container } = renderPage();

    act(() => {
      getAmountInput(container).onChange('25');
    });
    expect(getByText('$25.00')).toBeTruthy();
    // ≥ $25 的最低档 t2（min $50 → 上限 $500）
    expect(getByText('缴纳 $50 → 可接上限 $500')).toBeTruthy();
  });

  it('resubmitAmount 预填（记录页 REJECTED 重提）→ $25.00', () => {
    mockParams = { resubmitAmount: '2500' };
    const { getByText } = renderPage();

    expect(getByText('$25.00')).toBeTruthy();
    expect(getByText('确认缴纳 $25.00')).toBeTruthy();
  });

  it('清空输入 → 预览「—」，不保留上一个有效金额', () => {
    const { getByText, container } = renderPage();

    act(() => {
      getAmountInput(container).onChange('25');
      getAmountInput(container).onChange('');
    });
    expect(getByText('—')).toBeTruthy();
  });
});

describe('线上 mock 支付', () => {
  it('两步成功（create → pay-mock）→ success toast + router.back 回详情', async () => {
    mockCreateAsync.mockResolvedValue({ id: 'r1' });
    mockPayMockAsync.mockResolvedValue({});
    const { getByText } = renderPage();

    fireEvent.click(findPressableByText(getByText, '确认缴纳 $50.00'));
    await waitFor(() => {
      expect(mockCreateAsync).toHaveBeenCalledWith({
        channel: 'ONLINE_MOCK',
        amount: 5000,
      });
      expect(mockPayMockAsync).toHaveBeenCalledWith('r1');
      expect(showToastMock).toHaveBeenCalledWith('支付成功，上限已即时提升', 'success');
      expect(mockRouterBack).toHaveBeenCalled();
    });
  });

  it('失败 → e.message toast，不 back', async () => {
    mockCreateAsync.mockRejectedValue(new Error('余额不足'));
    const { getByText } = renderPage();

    fireEvent.click(findPressableByText(getByText, '确认缴纳 $50.00'));
    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('余额不足', 'error');
      expect(mockRouterBack).not.toHaveBeenCalled();
    });
  });

  it('提交中（isPending）→ spinner + 点击阻断防连点（Button B1 语义，审查 P3-7）', () => {
    mockCreatePending.value = true;
    const { getByText, container } = renderPage();

    // loading spinner 渲染（Button loading prop）
    expect(container.querySelector('[data-testid="button-spinner"]')).not.toBeNull();
    // 提交中点击被阻断（Button disabled=true → host 不挂 onClick）
    fireEvent.click(findPressableByText(getByText, '确认缴纳 $50.00'));
    expect(mockCreateAsync).not.toHaveBeenCalled();
  });
});

describe('线下 COD', () => {
  it('未选缴纳点提交 → toast「请选择缴纳点」，不创建申请', async () => {
    const { getByText } = renderPage();

    fireEvent.click(findPressableByText(getByText, '线下 COD'));
    fireEvent.click(findPressableByText(getByText, '提交申请'));
    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('请选择缴纳点', 'error');
    });
    expect(mockCreateAsync).not.toHaveBeenCalled();
  });

  it('选中缴纳点提交 → create 带 locationId/note + toast + back', async () => {
    mockCreateAsync.mockResolvedValue({ id: 'r2' });
    const { getByText, container } = renderPage();

    fireEvent.click(findPressableByText(getByText, '线下 COD'));
    // note 输入是 COD 区第二个 TextInput（金额输入第一个）
    // 原因：query selector 返回 Element，需取测试 host 壳挂在节点的 __fnProps（非标准 DOM 属性）
    const noteInput = container.querySelectorAll('[data-rn-host="TextInput"]')[1] as unknown as {
      __fnProps: { onChangeText: (v: string) => void };
    };
    act(() => {
      noteInput.__fnProps.onChangeText('现金缴纳');
    });
    fireEvent.click(findPressableByText(getByText, 'Dili 服务中心'));
    fireEvent.click(findPressableByText(getByText, '提交申请'));
    await waitFor(() => {
      expect(mockCreateAsync).toHaveBeenCalledWith({
        channel: 'OFFLINE_COD',
        amount: 5000,
        locationId: 'loc1',
        note: '现金缴纳',
      });
      expect(showToastMock).toHaveBeenCalledWith('已提交，等待 admin 确认', 'success');
      expect(mockRouterBack).toHaveBeenCalled();
    });
  });

  it('缴纳点列表 error → 错误文案 + 重试（§8.2）', () => {
    mockLocationsQ = {
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockLocationsRefetch,
    };
    const { getByText } = renderPage();

    fireEvent.click(findPressableByText(getByText, '线下 COD'));
    expect(getByText('缴纳点加载失败，请重试')).toBeTruthy();
    fireEvent.click(findPressableByText(getByText, '重试'));
    expect(mockLocationsRefetch).toHaveBeenCalledTimes(1);
  });

  it('缴纳点列表 empty → 「暂无可用缴纳点」（§8.2）', () => {
    mockLocationsQ = { data: [], isLoading: false, isError: false, refetch: mockLocationsRefetch };
    const { getByText } = renderPage();

    fireEvent.click(findPressableByText(getByText, '线下 COD'));
    expect(getByText('暂无可用缴纳点')).toBeTruthy();
  });

  it('缴纳点 loading → skeleton（§8.2）', () => {
    mockLocationsQ = {
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: mockLocationsRefetch,
    };
    const { getByText, queryByText } = renderPage();

    fireEvent.click(findPressableByText(getByText, '线下 COD'));
    expect(queryByText('Dili 服务中心')).toBeNull();
  });
});

describe('档位提示（§6.2）', () => {
  it('tiers error → 「档位信息暂不可用」+ 重试', () => {
    mockTiersQ = { data: undefined, isLoading: false, isError: true, refetch: mockTiersRefetch };
    const { getByText } = renderPage();

    expect(getByText('档位信息暂不可用')).toBeTruthy();
    fireEvent.click(findPressableByText(getByText, '重试'));
    expect(mockTiersRefetch).toHaveBeenCalledTimes(1);
  });

  it('tiers loading → skeleton，不出预估', () => {
    mockTiersQ = { data: undefined, isLoading: true, isError: false, refetch: mockTiersRefetch };
    const { queryByText } = renderPage();

    expect(queryByText(/可接上限/)).toBeNull();
  });
});
