/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render } from '@testing-library/react';
import { type ReactNode } from 'react';
import { Linking } from 'react-native';

import NavigatePage from './navigate';
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
          contactName: 'Resident 4B',
          contactPhone: mockDropoffPhone,
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
    const { getByText, container } = renderPage();

    expect(getByText('剩余时间')).toBeTruthy();
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

describe('联系客人入口（T4 §3.6）', () => {
  it('有 contactPhone：显示联系人 + 「致电」按钮，点击打开 tel:', async () => {
    const { getByText } = renderPage();

    expect(getByText(/Resident 4B/)).toBeTruthy();
    expect(getByText('致电')).toBeTruthy();

    await act(async () => {
      fireEvent.click(getByText('致电'));
    });
    expect((Linking as unknown as { openURL: jest.Mock }).openURL).toHaveBeenCalledWith('tel:+670 7733 4072');
  });

  it('无 contactPhone：致电禁用显示「无电话」，点击无动作', async () => {
    mockDropoffPhone = null;
    const { getByText } = renderPage();

    expect(getByText('无电话')).toBeTruthy();

    await act(async () => {
      fireEvent.click(getByText('无电话'));
    });
    expect((Linking as unknown as { openURL: jest.Mock }).openURL).not.toHaveBeenCalled();
  });

  it('聊天按钮：toast 占位（chatComingSoon）', async () => {
    const { getByText } = renderPage();

    await act(async () => {
      fireEvent.click(getByText('聊天'));
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
