/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react';
import { type ReactNode } from 'react';

/**
 * 20261116 三步流统一批（F6 回归 + F8 退货 tag）：
 *   ① deliveries tab 内 PICKED_UP 任务点卡片本体 → 跳 navigate（非 sign）——
 *      原硬编码 router.push(sign) 会让 PICKED_UP 绕过 startDelivering 静默跳步；
 *   ② deliveries tab 内 DELIVERING 任务 → 跳 sign；
 *   ③ taskType='return' 卡片渲染「退货取件」tag（方案 α，方案 v2 F8）；
 *   ④ deliveries tab 内 PICKED_UP 任务按钮文案为「开始配送」（getTaskAction 同源）。
 *
 * 桩法同 tasks.test.tsx（web project + RN host 壳 + useTaskLists/useSettings 桩）。
 */

const mockPush = jest.fn();
const mockRefetch = jest.fn();
// 初始 tab（useLocalSearchParams ?tab= 直入——页面 useState 初值只在挂载时读一次）
let mockTabParam: string | undefined = 'deliveries';

// 模块级 let 变量：useTaskLists 工厂内按引用读取（beforeEach 重设）
let mockLists: { available: unknown[]; pickups: unknown[]; deliveries: unknown[] } = {
  available: [],
  pickups: [],
  deliveries: [],
};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  }),
  useLocalSearchParams: () => ({ tab: mockTabParam }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('../../../src/services/queries/useTask', () => ({
  useTaskLists: () => ({
    data: mockLists,
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
  const TasksPage = require('../../../app/(main)/tasks').default;
  return render(<TasksPage />, { wrapper });
}

/** deliveries tab 任务桩（最小字段，页面 props 组装走 getTaskAction/buildDeadlineLabels） */
function makeDeliveryTask(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'task-1',
    orderId: '7c47aacc-e50b-41e7-aa47-902505800877',
    orderNo: 'MM20261116010001',
    status: 'PICKED_UP',
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
    createdAt: '2026-11-16T10:00:00Z',
    updatedAt: '2026-11-16T10:00:00Z',
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

/** 切 tab：RN mock 壳把 Pressable 的 onPress 接到 click 事件——fireEvent.click 即可 */
function openTab(container: HTMLElement, label: RegExp) {
  const tab = Array.from(container.querySelectorAll('[data-prop-accessibilityrole="tab"]')).find(
    (el) => label.test(el.getAttribute('data-prop-accessibilitylabel') ?? ''),
  );
  if (!tab) throw new Error(`tab ${label} 未渲染`);
  fireEvent.click(tab);
}

beforeEach(() => {
  mockLists = { available: [], pickups: [], deliveries: [] };
  mockPush.mockClear();
  mockRefetch.mockClear();
  mockTabParam = 'deliveries';
});

describe('deliveries tab 分组口径（20261116 三步流统一）', () => {
  it('F6 回归：PICKED_UP 任务点卡片 → 跳 navigate（非 sign，不绕过 startDelivering）', () => {
    mockLists = { available: [], pickups: [], deliveries: [makeDeliveryTask()] };
    const { getByText, getAllByText, container } = renderPage();
    openTab(container, /^配送中/);

    // 按钮文案走 getTaskAction（PICKED_UP→开始配送），证明 props 组装正确
    expect(getByText('开始配送')).toBeTruthy();
    // 单号展示（业务单号）
    expect(getAllByText('MM20261116010001').length).toBeGreaterThan(0);

    // TaskCard 无卡体级 onPress——导航入口就是主行动按钮（onAction→actionHandlers）
    fireEvent.click(getByText('开始配送'));
    expect(mockPush).toHaveBeenCalledWith('/task/task-1/navigate');
    expect(mockPush).not.toHaveBeenCalledWith('/task/task-1/sign');
  });

  it('DELIVERING 任务点卡片 → 跳 sign', () => {
    mockLists = {
      available: [],
      pickups: [],
      deliveries: [makeDeliveryTask({ status: 'DELIVERING' })],
    };
    const { getByText, container } = renderPage();
    openTab(container, /^配送中/);

    // DELIVERING → getTaskAction labelKey=tasks.arrivedDelivery（已到送达点）
    expect(getByText('已到送达点')).toBeTruthy();
    fireEvent.click(getByText('已到送达点'));
    expect(mockPush).toHaveBeenCalledWith('/task/task-1/sign');
  });

  it('F8 退货 tag：taskType=return 的 deliveries 卡渲染「退货取件」badge', () => {
    mockLists = {
      available: [],
      pickups: [],
      deliveries: [makeDeliveryTask({ taskType: 'return', refundId: 'refund-1' })],
    };
    const { getByText, container } = renderPage();
    openTab(container, /^配送中/);

    expect(getByText('退货取件')).toBeTruthy();
  });

  it('普通配送单不渲染退货 tag', () => {
    mockLists = { available: [], pickups: [], deliveries: [makeDeliveryTask()] };
    const { queryByText, container } = renderPage();
    openTab(container, /^配送中/);

    expect(queryByText('退货取件')).toBeNull();
  });

  it('pickups tab（ASSIGNED）按钮文案仍为「已到取货点」', () => {
    mockTabParam = 'pickups';
    mockLists = {
      available: [],
      pickups: [makeDeliveryTask({ status: 'ASSIGNED' })],
      deliveries: [],
    };
    const { getByText } = renderPage();

    expect(getByText('已到取货点')).toBeTruthy();
  });
});
