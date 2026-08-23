/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render } from '@testing-library/react';
import { type ReactNode } from 'react';

import ProfilePage from '../../../app/(main)/profile';
import type { RiderProfile } from '../../../src/types/rider';

/**
 * ProfilePage 单测 —— P1：个人中心统计假数据治理与头像兜底。
 *
 * 覆盖拍板（P1 §4 全 A）：
 *   §3.1① 统计区三栏接真实数据（今日订单 useOrderTodayStats.count / 今日收入 formatCurrency / 总配送 rider.totalDeliveries）
 *   §3.2② 评分星标 ★ {rating}（tier 徽章删除，改 ratingSuffix「分」）
 *   §3.3   头像兜底——avatarUrl 为空渲染 AppIcon rider（非空白圆）
 *   §3.4⑤ 页头接 SimplePageHeader + 返回 useGoBack（fallbackHref=tasks）
 *   §3.5④ 收入明细 MenuItem 改跳 /order/history（与钱包卡片 /(main)/earnings 区分）
 *   §3.6   locale 删 5 死 key（ordersValue/earningsValue/scoreValue/tier/rating）+ 新增 totalDeliveries/ratingSuffix
 *   ⑥      统计区三态——loading/error/null 显「—」
 *
 * 桩法与 earnings/history.test.tsx 同源（web project + RN host 壳）：
 *   - useOrderTodayStats：mockTodayState 切 ok/loading/error
 *   - useAuthStore：selector 友好桩，mockRider 控 rating/totalDeliveries/avatarUrl
 *   - useAuth：logout 桩
 *   - useRiderSettings：language='zh' 走 zh 字典（useTranslation 内部依赖）
 *   - useGoBack：mock 返回 fn，断言 SimplePageHeader 走 useGoBack
 *   - expo-router useRouter：spy push/replace
 * mock 变量名前缀 mock*（jest factory 白名单要求）。
 */

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockGoBack = jest.fn();

// 'today-ok' | 'today-loading' | 'today-error'
let mockTodayState = 'today-ok';
// 'rider-full'（有 avatarUrl/rating/totalDeliveries）| 'rider-no-avatar'（avatarUrl 空）
let mockRiderShape = 'rider-full';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (cb: () => unknown) => cb(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('../../../src/services/queries/useSettings', () => ({
  useRiderSettings: () => ({ data: { dutyStatus: 'onDuty', language: 'zh' } }),
}));

jest.mock('../../../src/services/queries/useOrder', () => ({
  useOrderTodayStats: () => {
    if (mockTodayState === 'today-loading') return { data: undefined, isLoading: true, isError: false };
    if (mockTodayState === 'today-error') return { data: undefined, isLoading: false, isError: true };
    return { data: { count: 15, totalIncome: 245.5 }, isLoading: false, isError: false };
  },
}));

jest.mock('../../../src/store/useAuthStore', () => ({
  useAuthStore: (selector: (s: { rider: RiderProfile | null; hydrate: () => Promise<void> }) => unknown) =>
    selector({
      rider: mockRiderShape === 'rider-full'
        ? { id: 'r-001', userId: 'u-1', riderName: 'Alex', phone: '+67077001234', vehicleType: 'MOTORCYCLE', vehiclePlate: null, status: 'ONLINE', applicationStatus: 'APPROVED', totalDeliveries: 128, rating: 4.9, preferredWarehouseIds: [], isOnline: true, createdAt: '', updatedAt: '', avatarUrl: 'https://example.com/a.png', name: 'Alex 骑手' }
        : { id: 'r-001', userId: 'u-1', riderName: 'Alex', phone: '+67077001234', vehicleType: 'MOTORCYCLE', vehiclePlate: null, status: 'ONLINE', applicationStatus: 'APPROVED', totalDeliveries: 128, rating: 4.9, preferredWarehouseIds: [], isOnline: true, createdAt: '', updatedAt: '', name: 'Alex 骑手' },
      hydrate: async () => {},
    }),
}));

jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => ({ logout: jest.fn() }),
}));

jest.mock('../../../src/hooks/useGoBack', () => ({
  useGoBack: () => mockGoBack,
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<ProfilePage />, { wrapper });
}

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockGoBack.mockReset();
  mockTodayState = 'today-ok';
  mockRiderShape = 'rider-full';
});

describe('统计区真实数据（P1 §3.1① + ⑥ 三态）', () => {
  it('today-ok → 今日订单 15 / 今日收入 ¥245.50 / 总配送 128', () => {
    const { getByText } = renderPage();
    expect(getByText('15')).toBeTruthy();
    expect(getByText('¥245.50')).toBeTruthy();
    expect(getByText('128')).toBeTruthy();
  });

  it('today-loading → 订单/收入显「—」（总配送仍取 rider 真实值）', () => {
    mockTodayState = 'today-loading';
    const { container } = renderPage();
    // 订单/收入栏「—」、总配送 128（统计区有两处「—」——订单栏数字 + 收入栏数字）
    const dashes = Array.from(container.querySelectorAll('[data-rn-host="Text"]'))
      .filter((el) => (el.textContent ?? '') === '—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
    // 总配送栏仍显真实值 128（来自 rider.totalDeliveries，不依赖 todayStats）
    expect(container.textContent ?? '').toContain('128');
  });

  it('today-error → 订单/收入显「—」', () => {
    mockTodayState = 'today-error';
    const { container } = renderPage();
    const dashes = Array.from(container.querySelectorAll('[data-rn-host="Text"]'))
      .filter((el) => (el.textContent ?? '') === '—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });
});

describe('评分星标（P1 §3.2② 拍板 A）', () => {
  it('头像下方徽章显 ★ {rating} {ratingSuffix}（非 tier 文案）', () => {
    const { container } = renderPage();
    // mockRider rating=4.9 → 「★ 4.9 分」
    expect(container.textContent ?? '').toContain('★ 4.9 分');
    // tier 假数据「金牌」已删
    expect(container.textContent ?? '').not.toContain('金牌');
  });
});

describe('头像兜底（P1 §3.3）', () => {
  it('avatarUrl 为空 → 渲染 AppIcon rider 默认头像（非 Image 空白圆）', () => {
    mockRiderShape = 'rider-no-avatar';
    const { container } = renderPage();
    // 兜底分支渲染 AppIcon（rider 图标），不渲染 Image
    expect(container.querySelector('[data-rn-host="Image"]')).toBeNull();
    // AppIcon name="rider" → MaterialCommunityIcons glyph bike-fast；mock 渲染为 <span data-testid="icon-bike-fast">
    expect(container.querySelector('[data-testid="icon-bike-fast"]')).not.toBeNull();
  });

  it('avatarUrl 有值 → 渲染 Image（source.uri 为该 URL）', () => {
    const { container } = renderPage();
    const img = container.querySelector('[data-rn-host="Image"]');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('data-prop-source')).toContain('https://example.com/a.png');
  });
});

describe('页头 SimplePageHeader + goBack（P1 §3.4⑤ 拍板 A）', () => {
  it('页头返回走 useGoBack（fallbackHref=tasks），非 router.replace 硬跳', () => {
    const { container } = renderPage();
    // SimplePageHeader 返回 Pressable（accessibilityLabel=common.back「返回」）
    const backBtn = Array.from(container.querySelectorAll('[data-rn-host="Pressable"]'))
      .find((el) => (el.getAttribute('data-prop-accessibilitylabel') ?? '') === '返回');
    expect(backBtn).toBeTruthy();
    // host 壳 onPress 接到 onClick：fireEvent.click 触发等价于按下返回
    act(() => {
      fireEvent.click(backBtn as Element);
    });
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    // 不应走 router.replace（旧硬跳 tasks 已删）
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('「编辑」按钮 action 跳 /profile/edit', () => {
    const { container } = renderPage();
    const editBtn = Array.from(container.querySelectorAll('[data-rn-host="Pressable"]'))
      .find((el) => (el.getAttribute('data-prop-accessibilitylabel') ?? '') === '编辑');
    expect(editBtn).toBeTruthy();
    act(() => {
      fireEvent.click(editBtn as Element);
    });
    expect(mockPush).toHaveBeenCalledWith('/profile/edit');
  });
});

describe('重复入口治理（P1 §3.5④ 拍板 A）', () => {
  it('「收入明细」MenuItem 改跳 /order/history（非 /(main)/earnings）', () => {
    const { container } = renderPage();
    const item = Array.from(container.querySelectorAll('[data-rn-host="Pressable"]'))
      .find((el) => (el.getAttribute('data-prop-accessibilitylabel') ?? '') === '收入明细');
    expect(item).toBeTruthy();
    act(() => {
      fireEvent.click(item as Element);
    });
    expect(mockPush).toHaveBeenCalledWith('/order/history');
  });

  it('「我的钱包」卡片仍跳 /(main)/earnings', () => {
    const { container } = renderPage();
    const item = Array.from(container.querySelectorAll('[data-rn-host="Pressable"]'))
      .find((el) => (el.getAttribute('data-prop-accessibilitylabel') ?? '') === '我的钱包');
    expect(item).toBeTruthy();
    act(() => {
      fireEvent.click(item as Element);
    });
    expect(mockPush).toHaveBeenCalledWith('/(main)/earnings');
  });
});
