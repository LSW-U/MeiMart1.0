/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react';
import { type ReactNode } from 'react';

import EarningsPage from '../../../app/(main)/earnings';
import type { EarningTransaction } from '../../../src/types/earnings';

/**
 * EarningsPage 单测 —— E1：三态接入（summary/transactions 双 QueryBoundary）、
 * tab 标题动态切换（修写死「今日」bug）、日期分组（今日/昨日/更早）、
 * 类型徽标（方案 A rider/gift/bank + 配色）、i18n 描述（替代英文 description 直出）。
 *
 * web project（jsdom）+ RN host 壳。桩法与 tasks.test.tsx 同源：
 *   - useEarningSummary/useEarningTransactions：mockSummaryState/mockTxState 切场景
 *   - useRiderSettings：language='zh' 走 zh 字典（useTranslation 内部依赖）
 *   - expo-router/useGoBack：页面测试不关心导航
 * 日期分组断言注意（方案 §3.8）：mock 交易时间相对 Date.now 动态生成，
 * 分组归属随跑测时刻变——断言用固定相对时间（今日=now-1h / 昨日=now-25h / 更早=now-3d）。
 * mock 变量名前缀 mock*（jest factory 白名单要求）。
 */

const mockRefetchSummary = jest.fn();
const mockRefetchTx = jest.fn();
const mockPush = jest.fn();
// 'summary-loading' | 'summary-error' | 'summary-ok'
let mockSummaryState = 'summary-ok';
// 'tx-loading' | 'tx-error' | 'tx-empty' | 'tx-ok'
let mockTxState = 'tx-ok';
// 交易列表（tx-ok 场景；beforeEach 重建相对时间）
let mockTransactions: EarningTransaction[] = [];

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('../../../src/services/queries/useSettings', () => ({
  useRiderSettings: () => ({ data: { dutyStatus: 'onDuty', language: 'zh' } }),
}));

jest.mock('../../../src/services/queries/useEarnings', () => ({
  useEarningSummary: () => {
    if (mockSummaryState === 'summary-loading') return { data: undefined, isLoading: true, isError: false, refetch: mockRefetchSummary };
    if (mockSummaryState === 'summary-error') return { data: undefined, isLoading: false, isError: true, refetch: mockRefetchSummary };
    return { data: { availableBalance: 128.5, todayEarnings: 24.5, weeklyEarnings: 186, monthlyEarnings: 720 }, isLoading: false, isError: false, refetch: mockRefetchSummary };
  },
  useEarningTransactions: () => {
    if (mockTxState === 'tx-loading') return { data: undefined, isLoading: true, isError: false, refetch: mockRefetchTx };
    if (mockTxState === 'tx-error') return { data: undefined, isLoading: false, isError: true, refetch: mockRefetchTx };
    if (mockTxState === 'tx-empty') return { data: [], isLoading: false, isError: false, refetch: mockRefetchTx };
    return { data: mockTransactions, isLoading: false, isError: false, refetch: mockRefetchTx };
  },
}));

jest.mock('../../../src/hooks/useGoBack', () => ({
  useGoBack: () => jest.fn(),
}));

function buildTx(overrides: Partial<EarningTransaction> & Pick<EarningTransaction, 'id' | 'type'>): EarningTransaction {
  return { amount: 10, createdAt: new Date().toISOString(), description: 'seed en text', orderId: '1023', ...overrides };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<EarningsPage />, { wrapper });
}

beforeEach(() => {
  mockRefetchSummary.mockClear();
  mockRefetchTx.mockClear();
  mockPush.mockClear();
  mockSummaryState = 'summary-ok';
  mockTxState = 'tx-ok';
  // 时间锚定（方案 §3.8 跨午夜坑的根治版）：以「今日 startOfDay」为锚而非 Date.now()
  // 相对偏移——now-1h 在 00:xx 跑测时落昨天，今日 tab 的 filter 会滤空整列表
  // （2026-08-23 凌晨实证）。锚定 startOfDay 后「今日/昨日/更早」分组归属与
  // 跑测时刻无关，任何时间跑都稳定。
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const HOUR = 60 * 60 * 1000;
  // service 层语义：按 createdAt 降序
  mockTransactions = [
    buildTx({ id: 'tx-today-delivery', type: 'deliveryFee', amount: 12.5, orderId: '1023', createdAt: new Date(startOfDay + 12 * HOUR).toISOString() }),
    buildTx({ id: 'tx-today-withdraw', type: 'withdrawal', amount: -10, createdAt: new Date(startOfDay + 8 * HOUR).toISOString() }),
    buildTx({ id: 'tx-yesterday-bonus', type: 'bonus', amount: 4, createdAt: new Date(startOfDay - 1 * HOUR).toISOString() }),
    buildTx({ id: 'tx-earlier-delivery', type: 'deliveryFee', amount: 8.2, orderId: '1021', createdAt: new Date(startOfDay - 3 * 24 * HOUR).toISOString() }),
  ];
});

describe('三态接入（E1 §3.1）', () => {
  it('summary loading：金额区显骨架（非「—」）', () => {
    mockSummaryState = 'summary-loading';
    const { container, queryByText } = renderPage();

    expect(container.querySelector('[data-testid="query-skeleton"]')).not.toBeNull();
    expect(queryByText('—')).toBeNull();
  });

  it('summary error：显示加载失败 + 重试，点重试 refetchSummary', () => {
    mockSummaryState = 'summary-error';
    const { getByText, getAllByText } = renderPage();

    expect(getByText('加载失败')).toBeTruthy();
    fireEvent.click(getAllByText('重试')[0]);
    expect(mockRefetchSummary).toHaveBeenCalledTimes(1);
  });

  it('transactions loading：列表区显骨架（非「暂无交易记录」）', () => {
    mockTxState = 'tx-loading';
    const { container, queryByText } = renderPage();

    expect(container.querySelector('[data-testid="query-skeleton"]')).not.toBeNull();
    expect(queryByText('暂无交易记录')).toBeNull();
  });

  it('transactions error：独立错误态 + 重试触发 refetchTx', () => {
    mockTxState = 'tx-error';
    const { getByText, getAllByText } = renderPage();

    // 余额卡正常渲染（summary 独立成功），交易区显示错误
    expect(getByText('$128.50')).toBeTruthy();
    const retryBtns = getAllByText('重试');
    expect(retryBtns.length).toBe(1);
    fireEvent.click(retryBtns[0]);
    expect(mockRefetchTx).toHaveBeenCalledTimes(1);
  });

  it('transactions 空态：显示「暂无交易记录」（非骨架非错误）', () => {
    mockTxState = 'tx-empty';
    const { getByText, container } = renderPage();

    expect(getByText('暂无交易记录')).toBeTruthy();
    expect(container.querySelector('[data-testid="query-empty"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="query-skeleton"]')).toBeNull();
  });
});

describe('tab 标题动态切换（E1 §3.2 修写死「今日」bug）', () => {
  it('默认「今日账单」tab：区块标题「今日」', () => {
    const { getByText } = renderPage();
    expect(getByText('今日账单')).toBeTruthy();
    expect(getByText('今日')).toBeTruthy();
  });

  it('切「全部账单」：区块标题变「全部账单」（不再写死今日）', () => {
    const { getByText, queryAllByText } = renderPage();

    fireEvent.click(getByText('全部账单'));
    // 标题与 tab 名同文案「全部账单」出现 ≥2（tab 本身 + 区块标题）
    expect(queryAllByText('全部账单').length).toBeGreaterThanOrEqual(2);
  });
});

describe('日期分组（E1 §3.3）', () => {
  it('「今日账单」：只显今日交易，无「昨日/更早」组头', () => {
    const { queryByText } = renderPage();

    expect(queryByText('昨日')).toBeNull();
    expect(queryByText('更早')).toBeNull();
  });

  it('「全部账单」：按 今日/昨日/更早 分组（mock 4 条跨三日）', () => {
    const { getByText } = renderPage();

    fireEvent.click(getByText('全部账单'));
    // 三组组头（今日组头与区块标题重复不叠——但「昨日」「更早」必须出现）
    expect(getByText('昨日')).toBeTruthy();
    expect(getByText('更早')).toBeTruthy();
  });
});

describe('类型徽标 + i18n 描述（E1 §3.4 方案 A / §3.5）', () => {
  it('交易标题按 type 生成中文（非 mock 英文 description 直出）', () => {
    const { getByText, queryByText } = renderPage();

    expect(getByText('配送收入 - 订单 #1023')).toBeTruthy();
    expect(getByText('提现至银行卡')).toBeTruthy();
    // 英文 seed 描述不再直出
    expect(queryByText(/Delivery #/)).toBeNull();
    expect(queryByText('Withdrawal to bank')).toBeNull();
  });

  it('「全部账单」下奖励交易：gift 徽标 + 「奖励收入」文案', () => {
    const { getByText, container } = renderPage();

    fireEvent.click(getByText('全部账单'));
    expect(getByText('奖励收入')).toBeTruthy();
    // gift 图标节点存在（icon mock 壳以 Material 名渲染 testID；rider=bike-fast / gift=gift-outline / bank=bank-outline）
    expect(container.querySelector('[data-testid="icon-gift-outline"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="icon-bike-fast"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="icon-bank-outline"]')).not.toBeNull();
    // 三种类型圆底 token 各就位（delivery 绿 / withdrawal 灰 / bonus 橙）
    const circles = container.querySelectorAll('[data-rn-host="View"]');
    const circleClasses = Array.from(circles).map((el) => el.getAttribute('data-prop-classname') ?? '');
    expect(circleClasses.some((c) => c.includes('bg-status-done-bg'))).toBe(true);
    expect(circleClasses.some((c) => c.includes('bg-warn-bg'))).toBe(true);
    expect(circleClasses.some((c) => c.includes('bg-surface-container-high'))).toBe(true);
  });

  it('方向箭头被类型徽标取代（不再渲染 arrowUp/arrowDown 图标节点）', () => {
    const { container } = renderPage();

    expect(container.querySelector('[data-testid="icon-arrow-up-bold"]')).toBeNull();
    expect(container.querySelector('[data-testid="icon-arrow-down-bold"]')).toBeNull();
  });
});

describe('balanceLabel 修正（E1 §3.6）', () => {
  it('余额标签不含「美元」（货币由 $ 前缀表达）', () => {
    const { getByText, queryByText } = renderPage();

    expect(getByText('钱包余额')).toBeTruthy();
    expect(queryByText(/美元/)).toBeNull();
    expect(getByText('$128.50')).toBeTruthy();
  });
});
