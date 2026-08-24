/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render } from '@testing-library/react';
import { type ReactNode } from 'react';

import TasksPage from '../../../app/(main)/tasks';
import { showToast } from '../../../src/components/feedback/Toast';

// showToast 被 jest.mock 成 jest.fn()——同 useTask.test 的既有收窄写法（模块成员 → jest.Mock）
const showToastMock = showToast as jest.Mock;

/**
 * TasksPage 单测 —— T1 审查 P3-1：切班失败 catch（b8ba835 修的弹窗卡死 bug
 * 核心分支，误删 catch 即回归）+ RefreshControl 离线守卫（弱网关键守卫，误删即
 * 离线下拉 error 态覆盖缓存）+ P6-1 三态 online（settings 加载失败保守不停派单）。
 *
 * web project（jsdom）+ RN host 壳。TasksPage 是重组件，依赖全部 jest.mock 成最小桩：
 *   - expo-router：useRouter/useLocalSearchParams 桩（页面测试不关心导航）
 *   - useTaskLists/useRiderSettings/useUpdateRiderSettings：真 hooks 不挂，桩掉
 *     （useTranslation 内部经 useRiderSettings 取 language，桩 data.language='zh' 走 zh 字典）
 *   - useNetwork：isOffline 由测试切换（离线守卫分支的关键输入）
 *   - useAuthStore：selector 友好桩（bondPaid=true 不渲染押金遮罩）
 *   - showToast：mock 模块取 spy（ToastHost 不挂载，断言调用参数而非渲染）
 * mock 变量名前缀 mock*（jest 防未初始化保护的白名单要求，factory 内引用安全）。
 * RefreshControl onRefresh：jsdom 模拟不了下拉手势——RN mock 壳把函数 props 原引用
 * 挂 DOM 节点 __fnProps（ScrollView wrapper 透传 refreshControl 为子节点），测试取回
 * 直调（守卫逻辑在回调内部，直调等价验证）。
 */

const mockRefetch = jest.fn();
const mockMutateAsync = jest.fn();
let mockOffline = false;
// P6-1：settings 加载态切换。'ok' | 'error'。'ok' → data.dutyStatus='onDuty'，'error' → isError=true。
let mockSettingsState = 'ok';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false }),
  useLocalSearchParams: () => ({}),
}));

// BottomActionBar/TaskDetailHeader 链上的 safe-area：jsdom 无 native runtime（同
// BottomActionBar.test 的既有处理），mock 固定 insets
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('../../../src/services/queries/useTask', () => ({
  useTaskLists: () => ({
    data: { available: [], pickups: [], deliveries: [] },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: mockRefetch,
  }),
}));

jest.mock('../../../src/services/queries/useSettings', () => ({
  // P6-1：补 isError 分支——mockSettingsState='error' 模拟 settings 加载失败（online=null 保守不停派单）。
  // 注意：error 态仍返回 data.language='zh'（useTranslation 内部读 settings?.language），保证 zh 字典回退不报错；
  // dutyStatus 缺失 → tasks.tsx dutyStatus=null（保守），但 useTranslation 仍走 zh 字典。
  useRiderSettings: () => {
    if (mockSettingsState === 'error') return { data: { language: 'zh' }, isError: true };
    return { data: { dutyStatus: 'onDuty', language: 'zh' }, isError: false };
  },
  useUpdateRiderSettings: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

jest.mock('../../../src/hooks/useNetwork', () => ({
  useNetwork: () => ({ isConnected: !mockOffline, isOffline: mockOffline }),
}));

jest.mock('../../../src/store/useAuthStore', () => ({
  useAuthStore: (selector: (s: { rider: unknown }) => unknown) => selector({ rider: { bondPaid: true } }),
}));

jest.mock('../../../src/components/feedback/Toast', () => ({
  showToast: jest.fn(),
}));

// dutyStatus 桩为 onDuty → online=true 走 QueryBoundary 数据态（空列表 → empty 分支，
// 两分支断言都不依赖列表内容）
function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<TasksPage />, { wrapper });
}

/** 从渲染结果取 RefreshControl 的 onRefresh 原函数：mock 壳把函数 props 原引用挂
 * DOM 节点 __fnProps（attribute 只能存字符串取不回函数），ScrollView wrapper 已把
 * refreshControl 透传为可查询的子节点 */
function getOnRefresh(container: HTMLElement): () => void {
  const rc = container.querySelector('[data-rn-host="RefreshControl"]') as (HTMLElement & { __fnProps?: Record<string, unknown> }) | null;
  if (!rc) throw new Error('RefreshControl 未渲染');
  return rc.__fnProps?.onRefresh as () => void;
}

beforeEach(() => {
  mockRefetch.mockClear();
  mockMutateAsync.mockReset();
  mockOffline = false;
  mockSettingsState = 'ok';
  showToastMock.mockClear();
});

describe('切班失败 catch（T1 清单 #5 弹窗卡死修复分支）', () => {
  it('mutateAsync reject → showToast(duty.updateFailed) + ConfirmDialog 关闭（visible 不再为 true）', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('network'));
    const { container, getByText } = renderPage();

    // 打开 duty 菜单（页头 onDutyPress）→ 选「已下班」→ ConfirmDialog 点确定
    // dutyStatus=onDuty 且 pickups/deliveries 空 → handlePick 直接 setPending(offDuty)
    fireEvent.click(getByText('工作中'));
    fireEvent.click(getByText('已下班'));
    await act(async () => {
      fireEvent.click(getByText('确定'));
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({ dutyStatus: 'offDuty' });
    expect(showToastMock).toHaveBeenCalledWith('班次切换失败，请重试', 'error');
    // 弹窗已关：两个 Modal（切班确认 + block）都不再 visible=true
    const openDialogs = Array.from(container.querySelectorAll('[data-rn-host="Modal"]')).filter(
      (m) => m.getAttribute('data-prop-visible') === 'true',
    );
    expect(openDialogs).toHaveLength(0);
  });

  it('mutateAsync resolve → 无 error toast、弹窗关闭', async () => {
    mockMutateAsync.mockResolvedValueOnce(undefined);
    const { container, getByText } = renderPage();

    fireEvent.click(getByText('工作中'));
    fireEvent.click(getByText('已下班'));
    await act(async () => {
      fireEvent.click(getByText('确定'));
    });

    expect(showToastMock).not.toHaveBeenCalled();
    const openDialogs = Array.from(container.querySelectorAll('[data-rn-host="Modal"]')).filter(
      (m) => m.getAttribute('data-prop-visible') === 'true',
    );
    expect(openDialogs).toHaveLength(0);
  });
});

describe('RefreshControl 离线守卫（T1 §7.2 拍板分支）', () => {
  it('渲染 RefreshControl，onRefresh 可从 host 取回（守卫接线完整）', () => {
    const { container } = renderPage();
    const rc = container.querySelector('[data-rn-host="RefreshControl"]');
    expect(rc).not.toBeNull();
    expect(typeof getOnRefresh(container)).toBe('function');
  });

  it('离线：onRefresh 只 toast networkError，不触发 refetch', () => {
    mockOffline = true;
    const { container } = renderPage();

    act(() => {
      getOnRefresh(container)();
    });

    expect(mockRefetch).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith('网络异常，请重试', 'error');
  });

  it('在线：onRefresh 触发 refetch，无 toast', () => {
    const { container } = renderPage();

    act(() => {
      getOnRefresh(container)();
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(showToastMock).not.toHaveBeenCalled();
  });
});

describe('P6-1 三态 online（settings 加载失败保守不停派单）', () => {
  // P6-1 核心断言：settings 加载失败（isError）→ online=null → renderContent 不走 offline 空态，
  // 仍渲染 QueryBoundary（任务列表三态）。原 bug：`settings?.dutyStatus ?? 'offDuty'` 在
  // settings=undefined 时回退 offDuty → online=false → 误显「你已离线」空态（静默掉线根因）。
  it('settings 加载失败：不显示「你已离线」空态，仍渲染任务列表（QueryBoundary）', () => {
    mockSettingsState = 'error';
    const { queryByText, container } = renderPage();

    // 不渲染 offline 空态标题/描述（online=null 不走 !online 分支）
    expect(queryByText('你已离线')).toBeNull();
    expect(queryByText('请重新上线以接收附近配送任务。')).toBeNull();
    // QueryBoundary 渲染：data 空列表 → 走 empty 态（EmptyState 宿主 View 在 DOM 中）
    // 比 offline 空态多一层 QueryBoundary 结构——断言 RefreshControl/ScrollView 仍在（列表区未被子空态替换）
    expect(container.querySelector('[data-rn-host="RefreshControl"]')).not.toBeNull();
  });

  // P6 §四.9：settings 加载失败时 header duty 区显「加载中」而非「已下班」（瞬时误导改进）。
  //   dutyStatus=null（settingsError）→ dutyLoading=true → TaskDetailHeader 显 t('duty.loading') + 中性灰点。
  it('settings 加载失败：header duty 区显「加载中」而非「已下班」（P6 §四.9）', () => {
    mockSettingsState = 'error';
    const { getByText, queryByText } = renderPage();

    expect(getByText('加载中…')).toBeTruthy();
    // 不显误导性的「已下班」（offDuty 占位仅作类型，视觉走 loading 分支）
    expect(queryByText('已下班')).toBeNull();
  });
});
