/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render } from '@testing-library/react';
import { type ReactNode } from 'react';
import { Linking } from 'react-native';

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
// P6 §四.9：settings 就绪态切换（'ok' 真实班次 / 'loading' 未就绪 / 'error' 加载失败）。
let mockDutySettings = 'ok';
// T6 §3.1：联系拨号两态（有电话 tel: 直拨 / 无电话 toast tasks.noPhone）
let mockContactPhone: string | null = null;

// Linking.openURL spy（navigate.test 同款范式；页面真 import react-native 的 Linking）
let mockLinkingOpenURL: jest.Mock;

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
          dropoff: { title: '久久公寓', address: '1 号楼', contactPhone: mockContactPhone ?? undefined },
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
  // P6 §四.9：mockDutySettings 切 'ok'|'loading'|'error'。'ok' → data.dutyStatus=mockDutyStatus；
  // 'loading' → data=undefined（settings 未就绪，dutyLoading=true）；'error' → isError=true。
  useRiderSettings: () => {
    if (mockDutySettings === 'error') return { data: { language: 'zh' }, isError: true };
    if (mockDutySettings === 'loading') return { data: undefined, isError: false };
    return { data: { dutyStatus: mockDutyStatus, language: 'zh' }, isError: false };
  },
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
  mockDutySettings = 'ok';
  mockContactPhone = null;
  mockLinkingOpenURL = jest.fn(async () => undefined);
  (Linking as unknown as { openURL: jest.Mock }).openURL = mockLinkingOpenURL;
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

describe('duty 真实班次 + 切班（T2 §3.1/§3.3 · T6 §7.4 A 后切班集中列表页）', () => {
  it('页头显示真实班次（offDuty 非硬编码「工作中」）', () => {
    const { getByText, queryByText } = renderPage();

    expect(getByText('已下班')).toBeTruthy();
    expect(queryByText('工作中')).toBeNull();
  });

  it('T6 §7.4 A：duty 区降级纯展示——点击不弹切班菜单、无 chevronDown', () => {
    const { getByText, queryByText, container } = renderPage();

    // 详情页专注单任务，切班在列表页做（TaskDetailHeader 未传 onDutyPress 降级 View）
    fireEvent.click(getByText('已下班'));

    expect(queryByText('切换状态')).toBeNull();
    expect(container.querySelector('[data-testid="icon-chevron-down"]')).toBeNull();
    expect(mockBack).not.toHaveBeenCalled();
  });

  // P6 §四.9：settings 未就绪（加载中/失败）→ duty 区显「加载中」而非「已下班」，
  // 避免瞬时误导（详情页 settings 跟列表页同源 useRiderSettings，加载中同样占位）。
  it('settings 未就绪：duty 区显「加载中」而非「已下班」（P6 §四.9）', () => {
    mockDutySettings = 'loading';
    const { getByText, queryByText } = renderPage();

    expect(getByText('加载中…')).toBeTruthy();
    expect(queryByText('已下班')).toBeNull();
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

describe('联系拨号接线 + 按钮重排（T6 §3.1/§7.7）', () => {
  // ASSIGNED 进行中卡片才有 active 按钮区（联系/聊天次要行）
  beforeEach(() => {
    mockTaskStatus = 'ASSIGNED';
  });

  it('有电话：联系按钮显示尾号，点击 Linking.openURL tel: 直拨', () => {
    mockContactPhone = '+670 7733 4072';
    const { getByText } = renderPage();

    // 原型 tc-btn-tel：label + 尾号（recipientSuffix「收件人手机尾号：4072」）
    expect(getByText(/收件人手机尾号.*4072/)).toBeTruthy();
    fireEvent.click(getByText(/收件人手机尾号.*4072/));

    expect(mockLinkingOpenURL).toHaveBeenCalledWith('tel:+670 7733 4072');
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it('有电话：拨号失败 catch → toast common.callFailed', async () => {
    mockContactPhone = '+670 7733 4072';
    mockLinkingOpenURL = jest.fn(async () => Promise.reject(new Error('no scheme')));
    (Linking as unknown as { openURL: jest.Mock }).openURL = mockLinkingOpenURL;
    const { getByText } = renderPage();

    fireEvent.click(getByText(/收件人手机尾号.*4072/));
    await act(async () => undefined);

    expect(showToastMock).toHaveBeenCalledWith('无法拨打电话', 'error');
  });

  it('无电话：联系按钮无尾号不降级隐藏，点击 toast tasks.noPhone（不触发 Linking）', () => {
    const { getByText } = renderPage();

    // §7.1 A：按钮可见（label「联系」无尾号），点击提示原因
    expect(getByText(/^联系$/)).toBeTruthy();
    fireEvent.click(getByText(/^联系$/));

    expect(mockLinkingOpenURL).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith('无电话', 'info');
  });

  it('聊天按钮：点击 toast tasks.chatComingSoon（i18n 替英文 fallback）', () => {
    const { getByText, queryByText } = renderPage();

    expect(queryByText(/Chat feature coming soon|Contact feature coming soon/)).toBeNull();
    fireEvent.click(getByText(/^聊天$/));

    expect(showToastMock).toHaveBeenCalledWith('聊天功能即将上线', 'info');
  });

  it('按钮重排：主 CTA 全宽 Button（bg-primary）在次要行上方', () => {
    const { container, getByText } = renderPage();

    // 主行动：Button host（h-14 全宽）+ bg-primary；次要行 Pressable 不再有 bg-primary-container 主行动
    const mainBtn = container.querySelector('[data-rn-host="Pressable"][data-prop-classname*="h-14"][data-prop-classname*="bg-primary"]');
    expect(mainBtn).not.toBeNull();
    expect(getByText('已到取货点')).toBeTruthy();
    // 次要行联系按钮描边红（有电话态 border-primary-container）
    mockContactPhone = '+670 7733 4072';
  });

  it('items chip：info 图标替 chevronDown + a11y label 复用 items 文本', () => {
    const { container } = renderPage();

    expect(container.querySelector('[data-testid="icon-information-outline"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="icon-chevron-down"]')).toBeNull();
  });
});
