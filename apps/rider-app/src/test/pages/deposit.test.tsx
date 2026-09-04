/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, type RenderResult } from '@testing-library/react';
import { type ReactNode } from 'react';

import DepositPage from '../../../app/settings/deposit/index';

/**
 * DepositPage 单测 —— 批 H（2026-09-03 方案拍板）三态重构。
 *
 * 覆盖拍板：
 *   3  三态拆分（未缴红/已缴绿/PENDING 橙 hero；PENDING 不渲染缴纳表单）
 *   4  已缴态「追加缴纳」主行动 + 记录入口仅一个
 *   5  已缴+PENDING 并存：hero 保留余额/上限 + PENDING banner 另起
 *   8  tier 缺失 → 「—/暂不可用」+ 重试，不显示「不限」
 *   E  升级提示由 /rider/deposit/tiers 派生（非固定 i18n 文案）
 *   + status loading 骨架 / error 卡片重试（方案 §8.1）
 *   + token 断言（§2.2 语义 token，无幽灵 class）
 *
 * 桩法与 withdraw.test.tsx 同源（web project + RN host 壳）：
 *   - useDepositStatus：mockStatusQ 可切 loading/error/三态数据
 *   - useDepositTiers / useDepositLocations：静态数据 + 可切 error
 *   - expo-router useRouter：push spy 断言 /pay 跳转与档位预设
 * mock 变量名前缀 mock*（jest factory 白名单要求）。
 */

type DepositTierFixture = {
  id: string;
  minAmount: number;
  maxOrderAmount: number | null;
  sortOrder: number;
  enabled: boolean;
};

type RecordFixture = {
  id: string;
  channel: 'ONLINE_MOCK' | 'OFFLINE_COD';
  requestedAmount: number;
  confirmedAmount: number | null;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'REFUNDED';
  locationId: string | null;
  note: string | null;
  adminNote: string | null;
  createdAt: string;
  paidAt: string | null;
  confirmedAt: string | null;
};

const mockRouterPush = jest.fn();
const mockStatusRefetch = jest.fn();

const TIERS: DepositTierFixture[] = [
  { id: 't1', minAmount: 100, maxOrderAmount: 10000, sortOrder: 1, enabled: true },
  { id: 't2', minAmount: 5000, maxOrderAmount: 50000, sortOrder: 2, enabled: true },
  { id: 't3', minAmount: 10000, maxOrderAmount: null, sortOrder: 3, enabled: true },
];

const LOCATIONS = [
  { id: 'loc1', name: 'Dili 服务中心', address: 'Dili 大街 1 号', note: null, enabled: true },
];

function makeStatus(overrides: {
  depositAmount?: number;
  tier?: DepositTierFixture | null;
  recentRequests?: RecordFixture[];
}) {
  return {
    depositAmount: overrides.depositAmount ?? 0,
    tier: overrides.tier === undefined ? null : overrides.tier,
    recentRequests: overrides.recentRequests ?? [],
  };
}

function makeRecord(overrides: Partial<RecordFixture>): RecordFixture {
  return {
    id: 'r1',
    channel: 'OFFLINE_COD',
    requestedAmount: 5000,
    confirmedAmount: null,
    status: 'PENDING',
    locationId: 'loc1',
    note: null,
    adminNote: null,
    createdAt: '2026-09-02T14:30:00.000Z',
    paidAt: null,
    confirmedAt: null,
    ...overrides,
  };
}

let mockStatusQ: {
  data: ReturnType<typeof makeStatus> | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} = { data: undefined, isLoading: false, isError: false, refetch: mockStatusRefetch };

let mockTiersQ: {
  data: DepositTierFixture[] | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} = { data: TIERS, isLoading: false, isError: false, refetch: jest.fn() };

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('../../../src/hooks/useGoBack', () => ({
  useGoBack: () => jest.fn(),
}));

jest.mock('../../../src/services/queries/useSettings', () => ({
  useRiderSettings: () => ({ data: { language: 'zh' } }),
}));

jest.mock('../../../src/services/queries/useDeposit', () => ({
  useDepositStatus: () => mockStatusQ,
  useDepositLocations: () => ({
    data: LOCATIONS,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useDepositTiers: () => mockTiersQ,
}));

function renderPage(): RenderResult {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<DepositPage />, { wrapper });
}

beforeEach(() => {
  mockRouterPush.mockClear();
  mockStatusRefetch.mockReset();
  mockStatusQ = {
    data: makeStatus({}),
    isLoading: false,
    isError: false,
    refetch: mockStatusRefetch,
  };
});

describe('未缴纳态（拍板 3 + 8）', () => {
  it('红 hero（bg-danger-soft）+ tier 缺失显示「—/暂不可用」+ 重试，不显示「不限」', () => {
    const { getByText, queryByText } = renderPage();

    expect(getByText('当前保证金')).toBeTruthy();
    expect(getByText('$0.00')).toBeTruthy();
    // 拍板 8：tier 缺失 → —/暂不可用，禁止「不限」
    expect(getByText('—')).toBeTruthy();
    expect(getByText('暂不可用')).toBeTruthy();
    expect(queryByText('不限')).toBeNull();
    // §2.2 token：未缴 hero 语义色（替换幽灵 status-danger 系背景 class）
    const hero = getByText('当前保证金').closest('[data-rn-host="View"]');
    expect(hero?.getAttribute('data-prop-className')).toContain('bg-danger-soft');
    expect(hero?.getAttribute('data-prop-className')).toContain('border-blush-border');
  });

  it('tier 缺失重试 → refetch status', () => {
    const { getByText } = renderPage();

    const retry = getByText('暂不可用')
      .closest('[data-rn-host="View"]')
      ?.querySelector('[data-rn-host="Pressable"]');
    expect(retry).not.toBeNull();
    fireEvent.click(retry as HTMLElement);
    expect(mockStatusRefetch).toHaveBeenCalledTimes(1);
  });

  it('去缴纳入口 → 跳 /settings/deposit/pay（拍板 6，表单在子页）', () => {
    const { getByText } = renderPage();

    fireEvent.click(getByText('去缴纳保证金').closest('[data-rn-host="Pressable"]') as HTMLElement);
    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/settings/deposit/pay',
      params: { presetAmount: '5000' },
    });
  });

  it('页脚「未缴纳 · 暂不可接单」', () => {
    const { getByText } = renderPage();
    expect(getByText('未缴纳 · 暂不可接单')).toBeTruthy();
  });
});

describe('已缴纳态（拍板 3 + 4 + E）', () => {
  beforeEach(() => {
    mockStatusQ = {
      data: makeStatus({
        depositAmount: 5000,
        tier: TIERS[1] ?? null,
        recentRequests: [makeRecord({ status: 'CONFIRMED', confirmedAmount: 5000 })],
      }),
      isLoading: false,
      isError: false,
      refetch: mockStatusRefetch,
    };
  });

  it('绿 hero（bg-status-done-bg）+ 上限 $500 + badge「当前档位」', () => {
    const { getByText } = renderPage();

    expect(getByText('已缴纳保证金')).toBeTruthy();
    expect(getByText('$50.00')).toBeTruthy();
    expect(getByText('$500.00')).toBeTruthy();
    expect(getByText('当前档位')).toBeTruthy();
    const hero = getByText('已缴纳保证金').closest('[data-rn-host="View"]');
    expect(hero?.getAttribute('data-prop-className')).toContain('bg-status-done-bg');
    // §2.2：金额 text-success-deep（替换幽灵 success 文字色 class）
    const amount = getByText('$50.00').closest('[data-rn-host="Text"]');
    expect(amount?.getAttribute('data-prop-className')).toContain('text-success-deep');
  });

  it('升级提示由 tiers 派生：余额 $50 → 下一档 $100（顶档封顶文案）', () => {
    const { getByText, queryByText } = renderPage();

    // t3 minAmount=$100、maxOrderAmount=null → topTier 文案 + 真实金额，非写死 i18n
    expect(getByText('缴纳 $100 → 上限已封顶')).toBeTruthy();
    expect(queryByText(/上限 \$500（封顶）/)).toBeNull();
  });

  it('「追加缴纳」主行动 + 记录入口仅一个（拍板 4）；追加跳 /pay 带下一档预设', () => {
    const { getByText, getAllByText } = renderPage();

    expect(getByText('追加缴纳（提升上限）')).toBeTruthy();
    expect(getAllByText('查看缴存记录 ›').length).toBe(1);

    fireEvent.click(
      getByText('追加缴纳（提升上限）').closest('[data-rn-host="Pressable"]') as HTMLElement,
    );
    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/settings/deposit/pay',
      params: { presetAmount: '10000' },
    });
  });

  it('页脚「已缴纳 · 可正常接单」', () => {
    const { getByText } = renderPage();
    expect(getByText('已缴纳 · 可正常接单')).toBeTruthy();
  });

  it('顶档用户（余额=顶档）追加缴纳 → 预设 max($50, 余额)，不给出更小默认值（审查 P3-4）', () => {
    mockStatusQ = {
      data: makeStatus({
        depositAmount: 10000,
        tier: TIERS[2] ?? null,
        recentRequests: [makeRecord({ status: 'CONFIRMED', confirmedAmount: 10000 })],
      }),
      isLoading: false,
      isError: false,
      refetch: mockStatusRefetch,
    };
    const { getByText } = renderPage();

    // 余额 $100 已达顶档（t3），nextTier=null → 预设回落 $100 而非 $50
    fireEvent.click(
      getByText('追加缴纳（提升上限）').closest('[data-rn-host="Pressable"]') as HTMLElement,
    );
    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/settings/deposit/pay',
      params: { presetAmount: '10000' },
    });
  });
});

describe('PENDING 态（拍板 3 + 5）', () => {
  it('未缴 + PENDING：橙 hero（bg-warn-bg）+ 引导 banner + 不渲染缴纳表单', () => {
    mockStatusQ = {
      data: makeStatus({
        depositAmount: 0,
        recentRequests: [makeRecord({})],
      }),
      isLoading: false,
      isError: false,
      refetch: mockStatusRefetch,
    };
    const { getByText, queryByText } = renderPage();

    expect(getByText('待确认保证金')).toBeTruthy();
    const hero = getByText('待确认保证金').closest('[data-rn-host="View"]');
    expect(hero?.getAttribute('data-prop-className')).toContain('bg-warn-bg');
    expect(hero?.getAttribute('data-prop-className')).toContain('border-warn-border');
    // 缴纳点来自 locations（不 fallback「所选缴纳点」）
    expect(getByText('Dili 服务中心')).toBeTruthy();
    expect(getByText('请前往 Dili 服务中心 缴纳 $50.00，admin 确认后即时生效。')).toBeTruthy();
    // 拍板 3：PENDING 默认不渲染缴纳表单（表单在 /pay）
    expect(queryByText('选择缴纳金额（≥ $1）')).toBeNull();
    // 未缴 PENDING 不显示「追加缴纳」（主行动仅已缴态）
    expect(queryByText('追加缴纳（提升上限）')).toBeNull();
  });

  it('已缴 + PENDING 并存（拍板 5）：hero 保留余额/上限 + PENDING banner 另起 + 页脚 pending', () => {
    mockStatusQ = {
      data: makeStatus({
        depositAmount: 5000,
        tier: TIERS[1] ?? null,
        recentRequests: [
          // 追加缴纳场景：已缴 $50，另有一笔 $100 线下申请待确认
          makeRecord({ requestedAmount: 10000 }),
          makeRecord({ id: 'r2', status: 'CONFIRMED', confirmedAmount: 5000 }),
        ],
      }),
      isLoading: false,
      isError: false,
      refetch: mockStatusRefetch,
    };
    const { getByText, queryAllByText } = renderPage();

    // 绿 hero 当前余额 + 上限不被 PENDING 覆盖
    expect(getByText('已缴纳保证金')).toBeTruthy();
    expect(getByText('$50.00')).toBeTruthy();
    expect(getByText('$500.00')).toBeTruthy();
    // PENDING banner 另起（橙）
    expect(getByText('待确认保证金')).toBeTruthy();
    expect(getByText('请前往 Dili 服务中心 缴纳 $100.00，admin 确认后即时生效。')).toBeTruthy();
    // 记录入口仍只一个（拍板 4）
    expect(queryAllByText('查看缴存记录 ›').length).toBe(1);
    // 页脚优先 pending
    expect(getByText('待确认期间暂按原上限接单')).toBeTruthy();
  });

  it('PENDING 缴纳点缺失：hero 位置「—」+ banner 降级文案（§5.3 不渲染空位置名）', () => {
    mockStatusQ = {
      data: makeStatus({
        depositAmount: 0,
        recentRequests: [makeRecord({ locationId: null })],
      }),
      isLoading: false,
      isError: false,
      refetch: mockStatusRefetch,
    };
    const { getByText, queryByText } = renderPage();

    expect(queryByText('Dili 服务中心')).toBeNull();
    expect(getByText('请按所选缴纳点缴纳 $50.00，admin 确认后即时生效。')).toBeTruthy();
  });
});

describe('loading / error（方案 §8.1）', () => {
  it('status loading → hero 骨架屏，不渲染任何态内容', () => {
    mockStatusQ = {
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: mockStatusRefetch,
    };
    const { queryByText } = renderPage();

    expect(queryByText('当前保证金')).toBeNull();
    expect(queryByText('待确认保证金')).toBeNull();
    expect(queryByText('已缴纳保证金')).toBeNull();
  });

  it('status error → 错误卡片 + 重试（不伪装成未缴纳），重试触发 refetch', () => {
    mockStatusQ = {
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockStatusRefetch,
    };
    const { getByText, getAllByText, queryByText } = renderPage();

    expect(getByText('保证金状态加载失败')).toBeTruthy();
    expect(queryByText('当前保证金')).toBeNull();
    // Button 组件 children Text 嵌套（外内两层 host），多节点匹配取首个
    fireEvent.click(getAllByText('重试')[0]!.closest('[data-rn-host="Pressable"]') as HTMLElement);
    expect(mockStatusRefetch).toHaveBeenCalledTimes(1);
  });
});
