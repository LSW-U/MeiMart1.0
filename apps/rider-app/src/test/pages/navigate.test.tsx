/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render } from '@testing-library/react';
import { type ReactNode } from 'react';
import { Linking } from 'react-native';

import NavigatePage from '../../../app/task/[id]/navigate';
import { showToast } from '../../../src/components/feedback/Toast';

const showToastMock = showToast as jest.Mock;

/**
 * NavigatePage 单测 -- T4：三态接入（QueryBoundary loading/error/empty）+ 假 chips/qty1
 * 清零 + 联系客人入口（致电 tel: / 无电话禁用 / 聊天 toast）。
 *
 * web project（jsdom）+ RN host 壳。桩法与 pickup.test.tsx 同源：
 *   - useTask：mockTaskState 切场景（loading/error/empty/PICKED_UP/DELIVERING/DELIVERED 守卫）
 *   - useStartDelivering：mock mutateAsync/isPending
 *   - Linking：spy react-native mock 壳的 Linking（tel:/maps 打开）
 * mock 变量名前缀 mock*（jest factory 白名单要求）。
 */

const mockRefetch = jest.fn();
const mockStartDelivering = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
// 'loading' | 'error' | 'empty' | 'PICKED_UP' | 'DELIVERING' | 'DELIVERED'
let mockTaskState: string = 'PICKED_UP';
// dropoff contactPhone：有值 -> 致电可用；null -> 禁用「无电话」
let mockDropoffPhone: string | null = '+670 7733 4072';
// 真机反馈③：real 任务 contactName 也可能 undefined（联系区常驻测试切场景用）
let mockContactName: string | null = 'Resident 4B';
// Linking mock（react-native mock 壳透出）
let mockLinkingCanOpen = true;
let mockLinkingOpen: ((url: string) => Promise<void>) | null = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack, canGoBack: () => true }),
  useLocalSearchParams: () => ({ id: 'task-1' }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('../../../src/hooks/useGoBack', () => ({
  useGoBack: () => mockBack,
}));

jest.mock('../../../src/services/queries/useTask', () => ({
  useTask: () => {
    if (mockTaskState === 'loading') return { data: undefined, isLoading: true, isError: false, refetch: mockRefetch };
    if (mockTaskState === 'error') return { data: undefined, isLoading: false, isError: true, refetch: mockRefetch };
    if (mockTaskState === 'empty') return { data: null, isLoading: false, isError: false, refetch: mockRefetch };
    return {
      data: {
        id: 'task-1',
        orderId: 'TL Delivery #102',
        status: mockTaskState,
        taskType: 'DELIVERY',
        pickup: { title: 'Lita Store (Colmera)', address: 'Rua de Colmera, Dili', coordinates: { latitude: -8.55, longitude: 125.56 } },
        dropoff: {
          title: 'Timor Plaza Apartments, Unit 4B',
          address: 'Avenida Presidente Nicolau Lobato, Dili',
          contactName: mockContactName ?? undefined,
          contactPhone: mockDropoffPhone ?? undefined,
          coordinates: { latitude: -8.54, longitude: 125.57 },
        },
        items: ['Groceries', '2kg', '2 units'],
        note: 'Please ring the bell twice',
        fee: 10,
        distanceKm: 3.7,
        estimatedMinutes: 30,
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    };
  },
  useStartDelivering: () => ({ mutateAsync: mockStartDelivering, isPending: false }),
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
  return render(<NavigatePage />, { wrapper });
}

beforeEach(() => {
  mockRefetch.mockClear();
  mockStartDelivering.mockReset();
  mockReplace.mockClear();
  mockPush.mockClear();
  mockBack.mockClear();
  showToastMock.mockClear();
  mockTaskState = 'PICKED_UP';
  mockDropoffPhone = '+670 7733 4072';
  mockContactName = 'Resident 4B';
  mockLinkingCanOpen = true;
  mockLinkingOpen = null;
  (Linking as unknown as { canOpenURL: jest.Mock }).canOpenURL = jest.fn(async () => mockLinkingCanOpen);
  (Linking as unknown as { openURL: jest.Mock }).openURL = jest.fn(
    async (url: string) => (mockLinkingOpen ? mockLinkingOpen(url) : undefined),
  );
});

describe('三态接入（T4 §3.1）', () => {
  it('loading：显示骨架，不渲染地图/卡片', () => {
    mockTaskState = 'loading';
    const { container, queryByText } = renderPage();

    expect(container.querySelector('[data-testid="query-skeleton"]')).not.toBeNull();
    expect(queryByText('剩余时间')).toBeNull();
  });

  it('error：显示加载失败 + 重试（弱网不再误报任务不存在），点重试 refetch', () => {
    mockTaskState = 'error';
    const { getByText } = renderPage();

    expect(getByText('加载失败')).toBeTruthy();
    fireEvent.click(getByText('重试'));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('empty（null）：显示任务不存在空态（非路线失效语义）', () => {
    mockTaskState = 'empty';
    const { getByText, queryByText } = renderPage();

    expect(getByText('任务未找到')).toBeTruthy();
    expect(getByText('该任务可能已完成、取消或重新分配。')).toBeTruthy();
    // 判错 1：routeNotFound（路线已不可用）不再误用
    expect(queryByText('该路线已不可用。')).toBeNull();
  });

  it('正常（PICKED_UP）：渲染路线卡 + 底栏双 CTA', () => {
    const { getByText, queryByText, container } = renderPage();

    // 真机反馈②：页头是「配送导航」（原型 step-title）非「订单详情」
    expect(getByText('配送导航')).toBeTruthy();
    expect(queryByText('订单详情')).toBeNull();
    // P1-1 后 ETA 移地图浮层（label 预计到达），路线卡内剩余时间区已移除
    expect(getByText('预计到达')).toBeTruthy();
    expect(getByText('TL Delivery #102')).toBeTruthy();
    // 打开导航是纯图标按钮（a11y label 非 Text 子节点），按 a11y 属性查
    expect(container.querySelector('[data-prop-accessibilitylabel="打开导航"]')).not.toBeNull();
    expect(getByText('去签收')).toBeTruthy();
  });
});

describe('假数据清零（T4 §3.2/§3.3）', () => {
  it('假 chips 已删（实名收件人/放置门口不再渲染）', () => {
    const { queryByText } = renderPage();

    expect(queryByText('实名收件人')).toBeNull();
    expect(queryByText('放置门口')).toBeNull();
  });

  it('qty1「数量：1」已删（items 元素独立渲染，不再自相矛盾）', () => {
    const { getByText, queryByText } = renderPage();

    expect(getByText('2 units')).toBeTruthy();
    expect(queryByText('数量：1')).toBeNull();
  });
});

describe('v2 视觉（T4 审查修复 P1-2/P2-1/P3-1）', () => {
  it('P1-2 进度条：已取货 done（check 图标）+ 配送中 active + 待送达 todo', () => {
    // 真机反馈①：进 navigate 页即处于「配送中」段（原型 271-289：step1 done 绿✓ + step2 active），
    // PICKED_UP/DELIVERING 都是 step=2——原 step=1 把「已取货」当当前步语义错已修
    const { getByText, container } = renderPage();

    expect(getByText('已取货')).toBeTruthy();
    expect(getByText('配送中')).toBeTruthy();
    expect(getByText('待送达')).toBeTruthy();
    // step1 done 有 check 图标；「配送中」label 是 active 红（text-primary class）
    expect(container.querySelector('[data-testid="icon-check"]')).not.toBeNull();
    const activeLabel = Array.from(container.querySelectorAll('[data-rn-host="Text"]')).find(
      (el) => el.textContent === '配送中',
    );
    expect(activeLabel?.getAttribute('data-prop-classname')).toContain('text-primary');
  });

  it('P2-1 路线卡序号化：marker 显示数字 1/2（marker 图标不再用于路线卡）', () => {
    const { getByText, container } = renderPage();

    expect(getByText('1')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(container.querySelector('[data-testid="icon-map-marker-radius"]')).toBeNull();
  });

  it('P3-1 dropoff 显示「送货上门」tag', () => {
    const { getByText } = renderPage();

    expect(getByText('送货上门')).toBeTruthy();
  });
});

describe('联系客人入口（T4 §3.6 · B1 裁决 B 40×40 图标钮形态）', () => {
  it('有 contactPhone：联系人姓名/电话分两行 + 致电图标钮，点击打开 tel:', async () => {
    const { getByText, container } = renderPage();

    // B1：原型 .contact-name/.contact-phone 分两行（不再合并「姓名 · 电话」单行）
    expect(getByText(/Resident 4B/)).toBeTruthy();
    expect(getByText('+670 7733 4072')).toBeTruthy();

    const callBtn = container.querySelector('[data-prop-accessibilitylabel="致电"]')!;
    expect(callBtn).toBeTruthy();

    await act(async () => {
      fireEvent.click(callBtn);
    });
    expect((Linking as unknown as { openURL: jest.Mock }).openURL).toHaveBeenCalledWith('tel:+670 7733 4072');
  });

  it('无 contactPhone：致电钮禁用（电话行显示「无电话」），点击无动作', async () => {
    mockDropoffPhone = null;
    const { getByText, container } = renderPage();

    expect(getByText('无电话')).toBeTruthy();

    const callBtn = container.querySelector('[data-prop-accessibilitylabel="无电话"]')!;
    // B1：禁用态 neutral-bg 浅底（原型 .contact-btn.disabled）
    expect((callBtn.getAttribute('data-prop-classname') ?? '')).toContain('bg-neutral-bg');

    await act(async () => {
      fireEvent.click(callBtn);
    });
    expect((Linking as unknown as { openURL: jest.Mock }).openURL).not.toHaveBeenCalled();
  });

  it('真机反馈③：联系区常驻——无 contactName/Phone 也不消失（占位「收件人」+「无电话」）', () => {
    // real 任务两字段都 undefined 时原条件渲染整块消失（40×40 钮不可见），原型此区常驻已修
    mockContactName = null;
    mockDropoffPhone = null;
    const { getByText, container } = renderPage();

    expect(getByText('收件人')).toBeTruthy();
    expect(getByText('无电话')).toBeTruthy();
    expect(container.querySelector('[data-prop-accessibilitylabel="无电话"]')).not.toBeNull();
    expect(container.querySelector('[data-prop-accessibilitylabel="聊天"]')).not.toBeNull();
  });

  it('聊天图标钮：toast 占位（chatComingSoon）', async () => {
    const { container } = renderPage();

    const chatBtn = container.querySelector('[data-prop-accessibilitylabel="聊天"]')!;
    expect(chatBtn).toBeTruthy();

    await act(async () => {
      fireEvent.click(chatBtn);
    });
    expect(showToastMock).toHaveBeenCalledWith('聊天功能即将上线', 'info');
  });
});

describe('底栏双 CTA（T4 §7.9/§3.5）', () => {
  it('打开导航按钮：Linking.canOpenURL + openURL（有坐标）', async () => {
    const { container } = renderPage();
    const navBtn = container.querySelector('[data-prop-accessibilitylabel="打开导航"]')!;

    await act(async () => {
      fireEvent.click(navBtn);
    });
    const openURL = (Linking as unknown as { openURL: jest.Mock }).openURL;
    expect(openURL).toHaveBeenCalledTimes(1);
    expect(String(openURL.mock.calls[0][0])).toContain('google.com/maps');
  });

  it('打开导航失败（openURL reject）：toast 无法打开导航', async () => {
    mockLinkingOpen = async () => {
      throw new Error('no maps app');
    };
    const { container } = renderPage();
    const navBtn = container.querySelector('[data-prop-accessibilitylabel="打开导航"]')!;

    await act(async () => {
      fireEvent.click(navBtn);
    });
    expect(showToastMock).toHaveBeenCalledWith('无法打开导航', 'error');
  });

  it('主按钮（delivery + PICKED_UP）：直接跳 sign（不 startDelivering）', async () => {
    const { getByText } = renderPage();

    await act(async () => {
      fireEvent.click(getByText('去签收'));
    });
    expect(mockStartDelivering).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/task/task-1/sign');
  });
});

describe('守卫（已有行为回归）', () => {
  it('DELIVERED（delivery 任务不允许）：replace 回详情页', () => {
    mockTaskState = 'DELIVERED';
    renderPage();

    expect(mockReplace).toHaveBeenCalledWith('/task/task-1');
  });
});
