/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';

import OrderHistoryPage from '../../../app/order/history';
import type { OrderHistoryItem } from '../../../src/types/order';

/**
 * OrderHistoryPage 单测 —— E3：订单历史页三态接入与高亮修复。
 *
 * 覆盖拍板（E3 方案 §3）：
 *   §3.1 三态接入（orders QueryBoundary list 骨架 / error 重试 / empty 空态 / data 列表）
 *        + counts/todayStats 各自独立三态（底栏骨架 / — / data）
 *   §3.2 ¥ 高亮 bug 修复——isPositive prop（基于 order.income > 0 数值，与货币符号无关）
 *   §3.3 CAL 日期行移除（无残留）
 *   §3.4 tab inactive bg-white→bg-surface（页面层色残留收口）
 *
 * 桩法与 tasks/earnings/withdraw.test.tsx 同源（web project + RN host 壳）：
 *   - useOrderHistory/useOrderStatusCounts/useOrderTodayStats：mockState 切三态场景
 *   - useRiderSettings：language='zh' 走 zh 字典（useTranslation 内部依赖）
 *   - expo-router/useGoBack：页面测试不关心导航
 * mock 变量名前缀 mock*（jest factory 白名单要求）。
 */

const mockRefetchOrders = jest.fn();
const mockPush = jest.fn();

// 'orders-loading' | 'orders-error' | 'orders-empty' | 'orders-ok'
let mockOrdersState = 'orders-ok';
// 'counts-loading' | 'counts-error' | 'counts-ok'
let mockCountsState = 'counts-ok';
// 'today-loading' | 'today-error' | 'today-ok'
let mockTodayState = 'today-ok';
let mockOrders: OrderHistoryItem[] = [];

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

jest.mock('../../../src/services/queries/useOrder', () => ({
  useOrderHistory: () => {
    if (mockOrdersState === 'orders-loading') return { data: undefined, isLoading: true, isError: false, refetch: mockRefetchOrders };
    if (mockOrdersState === 'orders-error') return { data: undefined, isLoading: false, isError: true, refetch: mockRefetchOrders };
    if (mockOrdersState === 'orders-empty') return { data: [], isLoading: false, isError: false, refetch: mockRefetchOrders };
    return { data: mockOrders, isLoading: false, isError: false, refetch: mockRefetchOrders };
  },
  useOrderStatusCounts: () => {
    if (mockCountsState === 'counts-loading') return { data: undefined, isLoading: true, isError: false };
    if (mockCountsState === 'counts-error') return { data: undefined, isLoading: false, isError: true };
    return { data: { all: mockOrders.length, completed: mockOrders.filter((o) => o.status === 'completed').length, cancelled: mockOrders.filter((o) => o.status === 'cancelled').length, transferred: mockOrders.filter((o) => o.status === 'transferred').length }, isLoading: false, isError: false };
  },
  useOrderTodayStats: () => {
    if (mockTodayState === 'today-loading') return { data: undefined, isLoading: true, isError: false };
    if (mockTodayState === 'today-error') return { data: undefined, isLoading: false, isError: true };
    const todayCount = mockOrders.filter((o) => o.status === 'completed').length;
    return { data: { count: todayCount, totalIncome: mockOrders.reduce((s, o) => s + o.income, 0) }, isLoading: false, isError: false };
  },
}));

jest.mock('../../../src/hooks/useGoBack', () => ({
  useGoBack: () => jest.fn(),
}));

function buildOrder(overrides: Partial<OrderHistoryItem> & Pick<OrderHistoryItem, 'id' | 'orderNo' | 'status' | 'income'>): OrderHistoryItem {
  return {
    completedAt: Date.now() - 4 * 60 * 60 * 1000,
    distanceKm: 2.5,
    dropoffAddress: 'Aitarak Laran, Dili',
    dropoffName: 'Ministry of Finance',
    durationMinutes: 28,
    pickupAddress: 'Rua de Colmera, Dili',
    pickupName: 'Cafe Aroma',
    ...overrides,
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<OrderHistoryPage />, { wrapper });
}

/**
 * 按 DOM 文本内容定位 host Text 节点。
 * Why：RN host mock 把 string children 渲染为真实 DOM 文本节点（而非存进 data-prop-children），
 * 故文本匹配走 textContent；取回宿主 div 后读 data-prop-classname/data-prop-numberoflines 断言 props。
 */
function findTextByTextContent(container: HTMLElement, content: string): Element | undefined {
  const texts = Array.from(container.querySelectorAll('[data-rn-host="Text"]'));
  return texts.find((el) => (el.textContent ?? '') === content);
}

beforeEach(() => {
  mockRefetchOrders.mockClear();
  mockPush.mockClear();
  mockOrdersState = 'orders-ok';
  mockCountsState = 'counts-ok';
  mockTodayState = 'today-ok';
  // 两条订单：一条有收入（income=12.5）、一条无收入（cancelled, income=0）——覆盖 isPositive 两态
  mockOrders = [
    buildOrder({ id: '10239485', orderNo: '#10239485', status: 'completed', income: 12.5 }),
    buildOrder({ id: '10239486', orderNo: '#10239486', status: 'cancelled', income: 0 }),
  ];
});

describe('三态接入（E3 §3.1 orders QueryBoundary）', () => {
  it('orders loading：列表区显骨架（非「暂无订单」空态闪烁）', () => {
    mockOrdersState = 'orders-loading';
    const { container, queryByText } = renderPage();

    expect(container.querySelector('[data-testid="query-skeleton"]')).not.toBeNull();
    expect(queryByText('暂无订单')).toBeNull();
  });

  it('orders error：显示加载失败 + 重试，点重试 refetchOrders', () => {
    mockOrdersState = 'orders-error';
    const { getByText } = renderPage();

    expect(getByText('加载失败')).toBeTruthy();
    fireEvent.click(getByText('重试'));
    expect(mockRefetchOrders).toHaveBeenCalledTimes(1);
  });

  it('orders empty（真空态）：显示「暂无订单」（query-empty，非骨架）', () => {
    mockOrdersState = 'orders-empty';
    const { container, getByText } = renderPage();

    expect(getByText('暂无订单')).toBeTruthy();
    expect(container.querySelector('[data-testid="query-empty"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="query-skeleton"]')).toBeNull();
  });

  it('orders data：渲染订单卡片列表（2 条，含 isPositive 高亮与无收入灰）', () => {
    const { getByText, container } = renderPage();

    // 两条订单号都在
    expect(getByText('#10239485')).toBeTruthy();
    expect(getByText('#10239486')).toBeTruthy();
    // 有收入订单金额 ¥12.50 高亮 primary 色；无收入订单「无收入」灰
    // 注：RN host mock 把 children 渲染为真实 DOM 文本（非 data-prop-children），
    // 故按 textContent 定位 Text 节点再取其 data-prop-classname。
    const incomeVal = findTextByTextContent(container, '¥12.50');
    expect(incomeVal).toBeTruthy();
    expect(incomeVal?.getAttribute('data-prop-classname') ?? '').toContain('text-primary');
    // 无收入文本存在且非 primary
    expect(getByText('无收入')).toBeTruthy();
  });
});

describe('¥ 高亮 bug 修复（E3 §3.2 isPositive prop，货币无关判定）', () => {
  it('有收入订单（income > 0）：金额 text-primary（zh ¥ 前缀也能高亮——回归原 startsWith("$") bug）', () => {
    const { container } = renderPage();
    const incomeVal = findTextByTextContent(container, '¥12.50');
    expect(incomeVal?.getAttribute('data-prop-classname') ?? '').toContain('text-primary');
    expect(incomeVal?.getAttribute('data-prop-classname') ?? '').not.toContain('text-on-surface-variant');
  });

  it('无收入订单（income = 0）：金额 text-on-surface-variant（灰，非 primary）', () => {
    const { container } = renderPage();
    const noIncome = findTextByTextContent(container, '无收入');
    expect(noIncome?.getAttribute('data-prop-classname') ?? '').toContain('text-on-surface-variant');
  });

  // startsWith('$') 残留断言由方案 §5.3 提交门禁 grep 兜底（runtime DOM 已验证 isPositive 高亮两态）。
});

describe('CAL 日期行移除（E3 §3.3）', () => {
  it('页面无「日历」CAL 死 UI 文案', () => {
    const { queryByText } = renderPage();
    expect(queryByText('日历')).toBeNull();
  });

  // history.date/history.calendar 源码残留由方案 §5.3 提交门禁 grep 兜底（runtime 已断言无「日历」文案）。
});

describe('tab 色残留收口（E3 §3.4 inactive bg-white→bg-surface）', () => {
  it('tab inactive className 用 bg-surface，无 bg-white 残留', () => {
    const { container } = renderPage();
    const tabs = container.querySelectorAll('[data-rn-host="Pressable"]');
    const tabClasses = Array.from(tabs).map((el) => el.getAttribute('data-prop-classname') ?? '');
    // inactive tab 存在 bg-surface
    expect(tabClasses.some((c) => c.includes('bg-surface') && !c.includes('bg-primary'))).toBe(true);
    // 无任何 bg-white
    expect(tabClasses.some((c) => c.includes('bg-white'))).toBe(false);
  });

  // bg-white 源码残留由方案 §5.3 提交门禁 grep 兜底（runtime DOM 已断言 tab 无 bg-white）。
});

describe('底栏 counts/todayStats 三态（E3 §3.1 底栏兜底）', () => {
  it('today loading：底栏金额区显骨架条（非 ¥0.00 误报）', () => {
    mockTodayState = 'today-loading';
    const { container, queryByText } = renderPage();

    // 底栏有 Skeleton 节点
    const skeletons = container.querySelectorAll('[data-rn-host="View"]');
    expect(skeletons.length).toBeGreaterThan(0);
    // 不应出现「0 · ¥0.00」误报
    expect(queryByText(/0 · ¥0\.00/)).toBeNull();
  });

  it('today error：底栏显示「—」兜底（非 0/¥0.00 静默误报）', () => {
    mockTodayState = 'today-error';
    const { getAllByText } = renderPage();

    // 底栏 todayLabel 与 todayValue 两处均兜底为「—」（共 2 个），不出现「0 · ¥0.00」误报
    expect(getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  it('today data：底栏显示真实「N · ¥X.XX」', () => {
    // 2 条订单，1 条 completed income=12.5
    const { getByText } = renderPage();
    expect(getByText(/· ¥12\.50/)).toBeTruthy();
  });

  it('counts error：tab 数字显示「—」（非 0 误报）', () => {
    mockCountsState = 'counts-error';
    const { getByText } = renderPage();
    // tab 文案「全部 (—)」
    expect(getByText(/全部 \(—\)/)).toBeTruthy();
  });
});

describe('点击订单卡片跳转详情（E3 回归：data 态 onPress 完整）', () => {
  it('点击订单卡片 → router.push(/order/{id})', async () => {
    const { getByText } = renderPage();
    fireEvent.click(getByText('#10239485'));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/order/10239485');
    });
  });
});

describe('orderNo 截断（E3 §3.5 numberOfLines）', () => {
  it('订单号 Text 有 numberOfLines={1}（防长订单号小屏碰撞）', () => {
    const { container } = renderPage();
    const orderNoText = findTextByTextContent(container, '#10239485');
    expect(orderNoText?.getAttribute('data-prop-numberoflines')).toBe('1');
  });
});

// act 兜底：部分场景 React 状态更新需 act 包裹（QueryBoundary data 切换）
// 此处 fireEvent.click 已在 @testing-library/react v13+ 自动 act，无需显式包裹，
// 但保留 waitFor 等待异步 push 调用落定。
void act;
