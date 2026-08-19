/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render } from '@testing-library/react';
import { type ReactNode } from 'react';

import TaskDetailPage from '../../../app/task/[id]';
import { showToast } from '../../../src/components/feedback/Toast';

const showToastMock = showToast as jest.Mock;

/**
 * TaskDetailPage 单测 —— T2：终态 banner（DELIVERED/FAILED 显示 banner +
 * 主 CTA「返回列表」非「刷新」）+ duty 接入切班（真实班次显示 + 切班 catch toast）。
 *
 * web project（jsdom）+ RN host 壳。桩法与 tasks.test.tsx 同源：
 *   - useTask：按测试场景切换 data（终态 DELIVERED / 进行中 ASSIGNED）
 *   - useTaskLists/useRiderSettings/useUpdateRiderSettings/useUnreadCount：真 hooks 不挂
 *   - useGoBack：桩 back/canGoBack，断言终态 CTA 触发返回
 * mock 变量名前缀 mock*（jest factory 白名单要求）。
 */

const mockRefetch = jest.fn();
const mockMutateAsync = jest.fn();
const mockAccept = jest.fn();
const mockBack = jest.fn();
let mockTaskStatus: string | null = 'DELIVERED';
let mockDutyStatus = 'offDuty';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack, canGoBack: () => true }),
  useLocalSearchParams: () => ({ id: 'task-1' }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('../../../src/hooks/useGoBack', () => ({
  useGoBack: () => mockBack,
}));

jest.mock('../../../src/services/queries/useTask', () => ({
  useTask: () => ({
    data: mockTaskStatus
      ? {
          id: 'task-1',
          orderId: 'TL-102',
          status: mockTaskStatus,
          taskType: 'DELIVERY',
          pickup: { title: '乐购超市', address: '杨浦区' },
          dropoff: { title: '久久公寓', address: '1 号楼' },
          items: ['超市'],
          fee: 10,
          distanceKm: 3.7,
          estimatedMinutes: 30,
        }
      : null,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: mockRefetch,
  }),
  useTaskLists: () => ({
    data: { available: [], pickups: [], deliveries: [] },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: mockRefetch,
  }),
  useAcceptTask: () => ({ mutateAsync: mockAccept, isPending: false }),
}));

jest.mock('../../../src/services/queries/useSettings', () => ({
  useRiderSettings: () => ({ data: { dutyStatus: mockDutyStatus, language: 'zh' } }),
  useUpdateRiderSettings: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

jest.mock('../../../src/services/queries/useNotifications', () => ({
  useUnreadCount: () => ({ data: 0 }),
}));

jest.mock('../../../src/hooks/useNetwork', () => ({
  useNetwork: () => ({ isConnected: true, isOffline: false }),
}));

jest.mock('../../../src/components/feedback/Toast', () => ({
  showToast: jest.fn(),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<TaskDetailPage />, { wrapper });
}

beforeEach(() => {
  mockRefetch.mockClear();
  mockMutateAsync.mockReset();
  mockAccept.mockReset();
  mockBack.mockClear();
  showToastMock.mockClear();
  mockTaskStatus = 'DELIVERED';
  mockDutyStatus = 'offDuty';
});

describe('终态 banner（T2 §3.4）', () => {
  it('DELIVERED：显示「已送达」banner + 主 CTA「返回列表」（非「刷新」）', () => {
    // P3-1 后「已送达」出现两处（banner 标题 + timeLabel 状态文本），getAll 断言
    const { getAllByText, getByText } = renderPage();

    expect(getAllByText('已送达').length).toBeGreaterThanOrEqual(2);
    expect(getByText('本单已完成，感谢您的配送')).toBeTruthy();
    // 主 CTA 是返回列表（底栏 BottomActionBar 的刷新 a11y label 仍存在，是 B5 设计，
    // 断言只管 TaskCard 主 CTA：返回列表出现即终态 CTA 生效）
    expect(getByText('返回列表')).toBeTruthy();
  });

  it('终态 timeLabel：已送达状态文本 + neutral tone（无 clock 图标）', () => {
    const { container } = renderPage();

    // P3-1：time 区 text-lg（banner 标题是 text-sm，同文案用字号区分），neutral 色 + 无 clock 图标
    const timeText = Array.from(container.querySelectorAll('[data-rn-host="Text"]')).find(
      (el) => el.textContent === '已送达' && (el.getAttribute('data-prop-classname') ?? '').includes('text-lg'),
    );
    expect(timeText?.getAttribute('data-prop-classname')).toContain('text-outline');
    expect(container.querySelector('[data-testid="icon-clock-outline"]')).toBeNull();
  });

  it('FAILED：timeLabel 显示「配送失败」+ error tone', () => {
    mockTaskStatus = 'FAILED';
    const { container } = renderPage();

    const timeText = Array.from(container.querySelectorAll('[data-rn-host="Text"]')).find(
      (el) => el.textContent === '配送失败' && (el.getAttribute('data-prop-classname') ?? '').includes('text-lg'),
    );
    expect(timeText?.getAttribute('data-prop-classname')).toContain('text-error');
    expect(container.querySelector('[data-testid="icon-clock-outline"]')).toBeNull();
  });

  it('FAILED：显示「配送失败」banner', () => {
    mockTaskStatus = 'FAILED';
    const { getAllByText, getByText } = renderPage();

    expect(getAllByText('配送失败').length).toBeGreaterThanOrEqual(2);
    expect(getByText('本单已标记为失败，请联系调度')).toBeTruthy();
    expect(getByText('返回列表')).toBeTruthy();
  });

  it('终态点「返回列表」触发 goBack，不触发 refetch', () => {
    const { getByText } = renderPage();

    // TaskCard 主按钮文案「返回列表」（active variant 的 action 区）
    fireEvent.click(getByText('返回列表'));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it('非终态（ASSIGNED）：无 banner，主 CTA 是业务 action 非「返回列表」', () => {
    mockTaskStatus = 'ASSIGNED';
    const { queryByText, getByText } = renderPage();

    expect(queryByText('已送达')).toBeNull();
    expect(queryByText('配送失败')).toBeNull();
    expect(queryByText('返回列表')).toBeNull();
    // ASSIGNED → 已到取货点（getTaskAction 状态机，zh.json 实值）
    expect(getByText('已到取货点')).toBeTruthy();
  });

  it('非终态（ASSIGNED）：time 显示「剩余 N 分钟」+ clock 图标（default tone）', () => {
    mockTaskStatus = 'ASSIGNED';
    const { getByText, container } = renderPage();

    expect(getByText(/剩余 30 分钟/)).toBeTruthy();
    expect(container.querySelector('[data-testid="icon-clock-outline"]')).not.toBeNull();
  });
});

describe('duty 真实班次 + 切班（T2 §3.1/§3.3）', () => {
  it('页头显示真实班次（offDuty 非硬编码「工作中」）', () => {
    const { getByText, queryByText } = renderPage();

    expect(getByText('已下班')).toBeTruthy();
    expect(queryByText('工作中')).toBeNull();
  });

  it('点 duty 区弹切班菜单（非返回上一页）', () => {
    const { getByText } = renderPage();

    fireEvent.click(getByText('已下班'));

    // DutyStatusMenu 打开（mock 壳 visible=false 不渲染 children——
    // 「切换状态」标题可查即菜单已打开；同时确认不是返回上一页）
    expect(getByText('切换状态')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('切班失败：toast duty.updateFailed + 弹窗关闭（复用 T1 catch 范式）', async () => {
    mockDutyStatus = 'onDuty';
    mockMutateAsync.mockRejectedValueOnce(new Error('network'));
    const { container, getByText } = renderPage();

    fireEvent.click(getByText('工作中'));
    fireEvent.click(getByText('已下班'));
    await act(async () => {
      fireEvent.click(getByText('确定'));
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({ dutyStatus: 'offDuty' });
    expect(showToastMock).toHaveBeenCalledWith('班次切换失败，请重试', 'error');
    const openDialogs = Array.from(container.querySelectorAll('[data-rn-host="Modal"]')).filter(
      (m) => m.getAttribute('data-prop-visible') === 'true',
    );
    expect(openDialogs).toHaveLength(0);
  });
});

describe('tab 行移除（T2 §3.2）', () => {
  it('详情页不渲染 tab 行（新任务/取货 tab 文案不出现）', () => {
    const { queryByText } = renderPage();

    // tab 专属文案（「新任务 (0)」等计数形式也不出现）；「距取货点」是 TaskCard 业务文案不算 tab
    expect(queryByText('新任务')).toBeNull();
    expect(queryByText(/新任务 \(/)).toBeNull();
    expect(queryByText(/配送中 \(/)).toBeNull();
    expect(queryByText(/待取货 \(/)).toBeNull();
  });
});
