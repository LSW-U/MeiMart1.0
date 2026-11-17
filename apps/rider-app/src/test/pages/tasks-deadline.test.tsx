/**
 * @jest-environment jsdom
 */
/**
 * 送达 deadline 锚点批测试（20261115 ⑤B）：
 *   - tasks 大厅卡三档降级链（锚点正常 / 临期红 / 超时红 / 无锚点降级约 n 分钟）
 *   - navigate ETA 浮层锚点倒计时 + 无锚点回退
 *   - pickup / task-detail 单号 orderNo ?? orderId 修复
 *
 * 放 src/test/pages/（expo-router 会把 app/ 下 .test.tsx 注册成路由，真机崩——memory 约定）。
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { type ReactNode } from 'react';

import { computeDeadline, parseDeadline } from '../../utils/deadline';

// ── 纯函数层 ──────────────────────────────────────────────

describe('computeDeadline（锚点解析三档）', () => {
  it('缺失/空串/畸形串 → null（降级输入）', () => {
    expect(parseDeadline(undefined)).toBeNull();
    expect(parseDeadline(null)).toBeNull();
    expect(parseDeadline('')).toBeNull();
    expect(parseDeadline('not-a-date')).toBeNull();
    expect(computeDeadline(undefined)).toBeNull();
    expect(computeDeadline('not-a-date')).toBeNull();
  });

  it('有锚点：minutesLeft 向下取整、urgent(<10min)、overdue(<=0) 三态', () => {
    const now = Date.parse('2026-11-15T12:00:00Z');
    // 剩 23 分钟
    const d1 = computeDeadline('2026-11-15T12:23:30Z', now);
    expect(d1).not.toBeNull();
    expect(d1!.minutesLeft).toBe(23);
    expect(d1!.urgent).toBe(false);
    expect(d1!.overdue).toBe(false);
    // 剩 9.5 分钟 → floor 9 → urgent
    const d2 = computeDeadline('2026-11-15T12:09:30Z', now)!;
    expect(d2.minutesLeft).toBe(9);
    expect(d2.urgent).toBe(true);
    // 已超时
    const d3 = computeDeadline('2026-11-15T11:59:00Z', now)!;
    expect(d3.overdue).toBe(true);
    expect(d3.urgent).toBe(false);
  });
});

// ── 页面层：mock 桩清单对齐 tasks.test.tsx 四层 mock 模式 ──

const mockPush = jest.fn();
const mockRefetch = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

// 大厅注入一张可控任务（available 非空 → newTaskProps 渲染 TaskCard）
let mockTask: Record<string, unknown> | null = null;
jest.mock('../../../src/services/queries/useTask', () => ({
  useTaskLists: () => ({
    data: { available: mockTask ? [mockTask] : [], pickups: [], deliveries: [] },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: mockRefetch,
  }),
  useReportIssue: () => ({
    isPending: false,
    mutateAsync: jest.fn().mockResolvedValue({ ticketNo: 'TK-TEST' }),
  }),
}));

jest.mock('../../../src/services/queries/useSettings', () => ({
  useRiderSettings: () => ({ data: { dutyStatus: 'onDuty', language: 'zh' }, isError: false }),
  useUpdateRiderSettings: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('../../../src/hooks/useNetwork', () => ({
  useNetwork: () => ({ isConnected: true, isOffline: false }),
}));

jest.mock('../../../src/store/useAuthStore', () => ({
  useAuthStore: (selector: (s: { rider: unknown }) => unknown) =>
    selector({ rider: { bondPaid: true } }),
}));

jest.mock('../../../src/services/queries/useDeposit', () => ({
  useDepositStatus: () => ({
    data: { depositAmount: 100, tier: null, recentRequests: [] },
  }),
}));

jest.mock('../../../src/components/feedback/Toast', () => ({ showToast: jest.fn() }));

function renderPage(): ReturnType<typeof render> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  // 页面按需引入（mock 就位后才 import）
  const TasksPage = require('../../../app/(main)/tasks').default;
  return render(<TasksPage />, { wrapper });
}

/** 大厅卡基础桩：锚点/单号字段由用例覆写 */
function makeTask(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'task-1',
    orderId: '7c47aacc-e50b-41e7-aa47-902505800877',
    orderNo: 'MM20261114010004',
    status: 'PENDING_ASSIGN',
    taskType: 'delivery',
    refundId: null,
    pickupAddress: '仓库 A',
    pickupLat: 0,
    pickupLng: 0,
    dropoffAddress: '收货地址 B',
    dropoffLat: 0,
    dropoffLng: 0,
    assignedAt: null,
    pickedUpAt: null,
    deliveredAt: null,
    note: null,
    createdAt: '2026-11-15T10:00:00Z',
    updatedAt: '2026-11-15T10:00:00Z',
    paymentMethod: 'COD',
    deliveryFee: 450,
    fee: 450,
    distanceKm: 3.7,
    estimatedMinutes: 30,
    items: [],
    pickup: { title: '仓库 A', address: '仓库 A' },
    dropoff: { title: '收货地址 B', address: '收货地址 B' },
    ...overrides,
  };
}

beforeEach(() => {
  mockTask = null;
  mockPush.mockClear();
  mockRefetch.mockClear();
});

describe('大厅卡 deadline 锚点三档（⑤B）', () => {
  it('有锚点：主行「需在 HH:mm 前送达」+ 副行「剩 n 分钟」+ 业务单号 + COD tag', () => {
    // 固定锚点为渲染后 23 分钟（ minutesLeft 由 computeDeadline 用 Date.now() 实时算，
    // 这里给足余量避免用例中途跨分钟：+23 分钟，不在 urgent 区间）
    const deadline = new Date(Date.now() + 23 * 60_000).toISOString();
    mockTask = makeTask({ estimatedArrival: deadline });
    const { getByText } = renderPage();

    expect(getByText(/需在 .*前送达/)).toBeTruthy();
    expect(getByText(/剩 2[0-9] 分钟/)).toBeTruthy();
    // 副行拼了距离（formatDistance 输出 3.7km，common.totalDistance = 「全程 {distance}」）
    expect(getByText(/剩 2[0-9] 分钟 · 全程 3.7km/)).toBeTruthy();
    // 单号修复：业务单号而非 UUID
    expect(getByText('MM20261114010004')).toBeTruthy();
    // COD tag
    expect(getByText('货到付款 · 需代收现金')).toBeTruthy();
  });

  it('临期（<10 分钟）：时间文案仍在，timeTone error 红色生效', () => {
    // 临期：+8 分钟（urgent 区间，文案切 deliverBy 主行仍渲染）
    mockTask = makeTask({ estimatedArrival: new Date(Date.now() + 8 * 60_000).toISOString() });
    const { getByText } = renderPage();
    const el = getByText(/需在 .*前送达/);
    // RN mock 壳把 className 挂 data-prop-classname（小写化）——error 档 text-error
    const cls = el.getAttribute('data-prop-classname') ?? '';
    expect(cls).toContain('text-error');
  });

  it('已超时：「已超时（HH:mm）」红色', () => {
    mockTask = makeTask({ estimatedArrival: new Date(Date.now() - 5 * 60_000).toISOString() });
    const { getByText } = renderPage();
    expect(getByText(/已超时（.*）/)).toBeTruthy();
    const el = getByText(/已超时（.*）/);
    expect(el.getAttribute('data-prop-classname') ?? '').toContain('text-error');
  });

  it('无锚点（历史单）：降级「约 n 分钟」诚实文案，不出「内送达」承诺', () => {
    mockTask = makeTask({ estimatedArrival: undefined });
    const { getAllByText, getByText, queryByText } = renderPage();
    expect(getByText('约 30 分钟')).toBeTruthy();
    // 副行只有距离（withDistance → 「全程 3.7km」；P 行 distance 同文案两处渲染 → getAllByText）
    expect(getAllByText('全程 3.7km').length).toBeGreaterThan(0);
    // 不出现承诺语气旧文案
    expect(queryByText('30 分钟内送达')).toBeNull();
  });

  it('锚点畸形串：同无锚点降级，不渲染 Invalid Date', () => {
    mockTask = makeTask({ estimatedArrival: 'garbage' });
    const { getByText, queryByText } = renderPage();
    expect(getByText('约 30 分钟')).toBeTruthy();
    expect(queryByText(/Invalid Date/)).toBeNull();
  });

  it('锚点有效但 estimatedMinutes 缺失 + 无距离：主行约 0 分钟、副行不渲染', () => {
    mockTask = makeTask({
      estimatedArrival: undefined,
      estimatedMinutes: undefined,
      distanceKm: undefined,
    });
    const { getByText, queryByText } = renderPage();
    expect(getByText('约 0 分钟')).toBeTruthy();
    // 距离部分不存在 → 副行整体不渲染（不出现悬空距离）
    expect(queryByText(/全程/)).toBeNull();
  });
});
