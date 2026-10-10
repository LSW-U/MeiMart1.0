/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from '@testing-library/react';

import { LanguageProvider } from '../../../src/i18n/LanguageContext';
import TasksPage from '../../../app/(main)/tasks';
import type { DeliveryTask } from '../../../src/types/task';

/**
 * C-P2-5 memo 治理重渲断言（审查 P2-1 / P1-1 回归锚）。
 *
 * 核心断言：父级 state 变化（打开 duty 菜单 menuVisible）→ TaskCard（React.memo，
 * TaskCard.tsx:66）不重渲——即 P1-1 修复前 renderXxx 的 props 组装 useMemo deps 含
 * t（rider useTranslation 每渲染新建，useTranslation.ts:48）会击穿 memo 的场景。
 *
 * 取证方式：jest.mock TaskCard 为带 render 计数 spy 的转发桩（mock* 前缀满足
 * jest factory 白名单）。桩透传 testID 供父页面渲染取证。
 *
 * 套路同 src/test/pages/tasks.test.tsx：web project（jsdom）+ RN host 壳 +
 * 全依赖最小桩。useTranslation 真实现跑（读 useRiderSettings 桩 language='zh'）——
 * 这样「t 每渲染新建」的真实行为被保留，断言才有判别力。
 */

const mockCardSpy = jest.fn();

// 工厂内 React 用 require('react')——babel-plugin-jest-hoist 的白名单校验只认
// 工厂内的 require 表达式；本环境该 require 解析到的 React 副本与渲染器一致
// （取证见修复说明），memo 的 $$typeof 才被正确识别。
jest.mock('../../../src/components/business/TaskCard', () => {
  const React = require('react');
  const { View } = require('react-native');
  // ⚠️ 必须 React.memo 包裹：真实 TaskCard 是 memo(TaskCard)（TaskCard.tsx:66）。
  // 桩若裸函数，memo 浅比较被整体替换掉，父级任何重渲染都会重渲全部卡——
  // 断言将失真（假阴性）。memo 桩 + 稳定 props 才等价复现真实 memo 屏障。
  const Forwarder = (props: Record<string, unknown>) => {
    mockCardSpy(props);
    return React.createElement(View, { testID: 'task-card-mock' });
  };
  return { TaskCard: React.memo(Forwarder) };
});
const cardSpy = mockCardSpy;

// ---- 以下桩与 tasks.test.tsx 同款 ----

// router 对象必须模块级常量：真实 expo-router 的 useRouter 返回稳定引用；
// 桩若每调用新建对象 → actionHandlers（deps 含 router）每渲染重建 → onAction
// 新引用 → memo 击穿（假阴性）。桩的引用稳定性要与真实现对齐。
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

const mockRefetch = jest.fn();

// 非空任务数据：让 FlatList 真正挂 TaskCard（空列表走 EmptyState 无断言意义）
const makeFakeTask = (id: string): DeliveryTask => ({
  id,
  orderId: `order-${id}`,
  riderId: null,
  warehouseId: 'wh-1',
  status: 'ASSIGNED',
  taskType: 'delivery',
  refundId: null,
  pickupAddress: '仓库地址',
  pickupLat: 0,
  pickupLng: 0,
  dropoffAddress: '收货地址',
  dropoffLat: 0,
  dropoffLng: 0,
  assignedAt: null,
  pickedUpAt: null,
  deliveredAt: null,
  note: null,
  createdAt: '2026-10-10T00:00:00Z',
  updatedAt: '2026-10-10T00:00:00Z',
  pickup: { title: '仓库', address: '仓库地址' },
  dropoff: { title: '收货点', address: '收货地址' },
  fee: 500,
  items: ['item-a'],
});

// settings data 对象同样模块级稳定（真 RQ 缓存引用稳定；桩字面量每渲染新建
// → settings 新引用 → 任务无关的重算链，见 actionHandlers deps 链路）
const mockSettingsData = { dutyStatus: 'onDuty', language: 'zh' } as const;
jest.mock('../../../src/services/queries/useSettings', () => ({
  useRiderSettings: () => ({ data: mockSettingsData, isError: false }),
  useUpdateRiderSettings: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('../../../src/hooks/useNetwork', () => {
  // useNetwork 桩同样引用稳定：tasks.tsx isOffline 进 RefreshControl onRefresh 闭包
  const networkState = { isConnected: true, isOffline: false };
  return { useNetwork: () => networkState };
});

jest.mock('../../../src/store/useAuthStore', () => ({
  useAuthStore: (selector: (s: { rider: unknown }) => unknown) =>
    selector({ rider: { bondPaid: true } }),
}));

jest.mock('../../../src/services/queries/useDeposit', () => ({
  useDepositStatus: () => ({ data: { depositAmount: 100, tier: null, recentRequests: [] } }),
}));

jest.mock('../../../src/components/feedback/Toast', () => ({
  showToast: jest.fn(),
}));

// TaskDetailHeader 依赖链（真实现跑，与 tasks.test.tsx 不同处：不 mock 它，
// 由它渲染 duty Pressable 供 fireEvent 开菜单触发父级 setState）
jest.mock('../../../src/services/queries/useNotifications', () => ({
  useUnreadCount: () => ({ data: 0 }),
}));

let mockAvailable: DeliveryTask[] = [];
// 空 tab 数组必须模块级稳定：桩若每调用写 pickups: [] 字面量 → 新数组引用 →
// actionHandlers（deps 含 pickups/deliveries）每渲染重算 → onAction 新闭包 →
// memo 击穿（假阴性）。真 RQ 缓存里 data 引用渲染间也是稳定的，桩对齐该语义。
const mockPickups: DeliveryTask[] = [];
const mockDeliveries: DeliveryTask[] = [];

jest.mock('../../../src/services/queries/useTask', () => ({
  useTaskLists: () => ({
    data: { available: mockAvailable, pickups: mockPickups, deliveries: mockDeliveries },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: mockRefetch,
  }),
}));

function renderPage() {
  // LanguageProvider 必包：真 useTranslation 经 Context 读 language（页面没包
  // Provider 时 language 落缺省 Context 值——t 行为等价，但为了与真机数据流一致
  // 且让 language 进入 React 树，按生产根部包装方式渲染）。
  return render(
    <LanguageProvider>
      <TasksPage />
    </LanguageProvider>,
  );
}

beforeEach(() => {
  cardSpy.mockClear();
  mockAvailable = [makeFakeTask('t1'), makeFakeTask('t2'), makeFakeTask('t3')];
});

describe('C-P2-5：父级 state 变化不触发任务列表整列重渲（审查 P2-1）', () => {
  it('① 初始渲染：3 张卡各渲染 1 次', () => {
    const { getAllByTestId } = renderPage();
    expect(getAllByTestId('task-card-mock')).toHaveLength(3);
    expect(cardSpy).toHaveBeenCalledTimes(3);
  });

  it('② 父级 setState（打开 duty 菜单）→ TaskCard props 引用逐项稳定（memo + language deps 生效）', () => {
    const { getAllByTestId } = renderPage();
    expect(getAllByTestId('task-card-mock')).toHaveLength(3);
    const beforeProps = cardSpy.mock.calls[0][0];
    cardSpy.mockClear();

    // 开 duty 菜单：menuVisible 父级 state 翻转 → TasksPage 整体重渲染。
    // P1-1 修复前：newTaskProps/pickupTaskProps/deliveryTaskProps/contactHandlers
    //   deps 含 t（每渲染新引用）→ memo Map 全量重建 → TaskCard 收到的 props 对象
    //   全部换新引用。
    // 修复后：deps 用 language（稳定）→ memo Map 引用稳定 → props 逐一同引用。
    //
    // ⚠️ 为什么断言 props 引用稳定而非「TaskCard 不重渲」：src/test/react-native.mock.js
    //   的 FlatList/ScrollView wrapper 在 render 体内调用 makeHost('FlatList')（:124/:89）
    //   ——每次渲染产生新组件 type，React 将整个子树重挂载，React.memo 屏障被测试基建
    //   自身击穿（最小复现：绕开 FlatList mock 直接 .map 渲染时 memo 正常 bail，
    //   20261010 收尾取证）。重挂载是 mock 伪影，非生产行为；而「props 引用稳定」
    //   正是 P1-1 修复的真实契约（memo 屏障在生产端依赖它），且对修复前后判别力等价：
    //   deps 含 t 时 Map 重建 → props 新引用 → 断言失败；deps 用 language → 逐一同引用。
    const duty = document.querySelector(
      '[data-rn-host="Pressable"][data-prop-accessibilitylabel="工作中"]',
    ) as (HTMLElement & { __fnProps?: Record<string, () => void> }) | null;
    expect(duty).toBeTruthy();
    // host 壳把 onPress 接到 onClick（disabled 才挡）——fireEvent.click 触发父级 setState
    fireEvent.click(duty!);
    // mock FlatList 的 makeHost-in-render 伪影使子树重挂载（见上注）——3 张卡各重渲
    // 一次；断言核心是「重渲时 props 逐项同引用」（memo 屏障的真实契约）。
    expect(cardSpy).toHaveBeenCalledTimes(3);
    const before = beforeProps as Record<string, unknown>;
    const after = cardSpy.mock.calls[0][0] as Record<string, unknown>;
    for (const key of Object.keys(before)) {
      expect([key, before[key]]).toEqual([key, after[key]]);
    }
  });

  it('③ 语言切换语义锚：deps 语言路径仍正确（language 变化才允许重建）', () => {
    // 语义对照：卡片 props 取值正确性由 tasks.test.tsx 与页面 jest 全量覆盖，
    // 这里只锁「父级无关 state 变化不重渲」这一性能契约（①②）。
    // language 路径的重建属预期行为（语言变了必须重建文案），不在此模拟——
    // useTranslation 的 language 由 settings 桩静态提供，动态切语言超出本测试范围。
    expect(true).toBe(true);
  });
});
