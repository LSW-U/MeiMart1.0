/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react';
import { type ReactNode } from 'react';

import OrderDetailPage from '../../../app/order/[id]';
import type { OrderHistoryItem } from '../../../src/types/order';

/**
 * OrderDetailPage 单测 —— E4：订单详情页三态接入与页头统一。
 *
 * 覆盖拍板（E4 方案 §3）：
 *   §3.1/§3.2 QueryBoundary 三态——loading→detail 骨架 / error→ErrorState+重试 / null→notFound / data→主体
 *   §3.4 页头统一 SimplePageHeader（删手写 Pressable+AppIcon 壳，useGoBack 内置）
 *   §3.5.4 4 处 bg-white→bg-surface 收口（同 E3 先例，零 bg-white 残留）
 *   §3.3 ③C：本步不实现 timeline（无 timeline 文案 / 无 timeline i18n key）
 *
 * 桩法与 history.test.tsx 同源（web project + RN host 壳）：
 *   - useOrder：mockState 切四态场景（loading/error/null/data）
 *   - useRiderSettings：language='zh' 走 zh 字典（useTranslation 内部依赖）
 *   - expo-router/useGoBack：页面测试不关心导航
 * mock 变量名前缀 mock*（jest factory 白名单要求）。
 */

const mockRefetch = jest.fn();
const mockBack = jest.fn();

// 'detail-loading' | 'detail-error' | 'detail-null' | 'detail-ok'
let mockOrderState = 'detail-ok';
let mockOrder: OrderHistoryItem | null = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack, canGoBack: () => true }),
  useLocalSearchParams: () => ({ id: '10239486' }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('../../../src/services/queries/useSettings', () => ({
  useRiderSettings: () => ({ data: { dutyStatus: 'onDuty', language: 'zh' } }),
}));

jest.mock('../../../src/services/queries/useOrder', () => ({
  useOrder: () => {
    if (mockOrderState === 'detail-loading') return { data: undefined, isLoading: true, isError: false, refetch: mockRefetch };
    if (mockOrderState === 'detail-error') return { data: undefined, isLoading: false, isError: true, refetch: mockRefetch };
    if (mockOrderState === 'detail-null') return { data: null, isLoading: false, isError: false, refetch: mockRefetch };
    return { data: mockOrder, isLoading: false, isError: false, refetch: mockRefetch };
  },
}));

jest.mock('../../../src/hooks/useGoBack', () => ({
  useGoBack: () => mockBack,
}));

function buildOrder(overrides: Partial<OrderHistoryItem> = {}): OrderHistoryItem {
  return {
    id: '10239486',
    orderNo: '#10239486',
    status: 'completed',
    income: 8.5,
    completedAt: 1724060700000,
    distanceKm: 1.2,
    durationMinutes: 18,
    pickupName: '帝力超市 · Colmera 店',
    pickupAddress: 'Av. Bispo Medeiros, Colmera, Dili',
    dropoffName: 'Timor Heritage Center',
    dropoffAddress: 'Rua de Santa Cruz, Dili',
    ...overrides,
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<OrderDetailPage />, { wrapper });
}

beforeEach(() => {
  mockRefetch.mockClear();
  mockBack.mockClear();
  mockOrderState = 'detail-ok';
  mockOrder = buildOrder();
});

describe('三态接入（E4 §3.1/§3.2 QueryBoundary）', () => {
  it('loading：内容区显 detail 骨架（非白屏 return null）', () => {
    mockOrderState = 'detail-loading';
    const { container, queryByText } = renderPage();

    expect(container.querySelector('[data-testid="query-skeleton"]')).not.toBeNull();
    // 不误报「未找到该订单」（旧 :40 return null + :43 判空会白屏/误报）
    expect(queryByText('未找到该订单')).toBeNull();
  });

  it('error：显示「加载失败」+ 重试按钮，点重试触发 refetch（非误报「未找到」）', () => {
    mockOrderState = 'detail-error';
    const { getByText, queryByText } = renderPage();

    expect(getByText('加载失败')).toBeTruthy();
    expect(getByText('请检查网络后重试')).toBeTruthy();
    // 请求失败 ≠ 订单不存在，错误态绝不误报 notFound
    expect(queryByText('未找到该订单')).toBeNull();

    fireEvent.click(getByText('重试'));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('null（订单真不存在）：显示「未找到该订单」空态，无重试按钮', () => {
    mockOrderState = 'detail-null';
    const { container, getByText, queryByText } = renderPage();

    expect(getByText('未找到该订单')).toBeTruthy();
    expect(getByText('该订单可能已被移除或不存在。')).toBeTruthy();
    expect(container.querySelector('[data-testid="query-empty"]')).not.toBeNull();
    // 订单不存在重试无意义——无重试按钮
    expect(queryByText('重试')).toBeNull();
  });

  it('data：渲染订单详情主体（订单号/取货/送达/距离/用时/收入）', () => {
    const { getByText, container } = renderPage();

    expect(getByText('#10239486')).toBeTruthy();
    expect(getByText('帝力超市 · Colmera 店')).toBeTruthy();
    expect(getByText('Timor Heritage Center')).toBeTruthy();
    expect(getByText('收入')).toBeTruthy();
    expect(container.querySelector('[data-testid="query-data"]')).not.toBeNull();
  });
});

describe('cancelled 边界态（E4 ③C：无 timeline 灰显）', () => {
  it('cancelled：用时显示「—」、收入显示「无收入」，无 timeline 文案', () => {
    mockOrder = buildOrder({ status: 'cancelled', income: 0, durationMinutes: 0 });
    const { getByText, queryByText } = renderPage();

    // durationMinutes=0 → 用时「—」（:90 三元）
    expect(getByText('—')).toBeTruthy();
    // income=0 → history.noIncome（:97）
    expect(getByText('无收入')).toBeTruthy();
    // ③C：本步不实现 timeline，不出现「配送流程」「已接单」等 timeline 文案
    expect(queryByText('配送流程')).toBeNull();
    expect(queryByText('已接单')).toBeNull();
  });
});

describe('bg-white 收口（E4 §3.5.4 ⑤A，同 E3 先例）', () => {
  it('4 张卡片 className 用 bg-surface，无 bg-white 残留', () => {
    const { container } = renderPage();

    const views = container.querySelectorAll('[data-rn-host="View"]');
    const classNames = Array.from(views).map((el) => el.getAttribute('data-prop-classname') ?? '');
    // 4 张卡片（订单号/取货送达/距离/用时）存在 bg-surface
    expect(classNames.filter((c) => c.includes('bg-surface')).length).toBeGreaterThanOrEqual(4);
    // 无任何 bg-white 残留（Q6 收口验证）
    expect(classNames.some((c) => c.includes('bg-white'))).toBe(false);
  });
});

describe('页头统一（E4 §3.4 SimplePageHeader）', () => {
  /**
   * 按 a11y label 定位 host 节点。
   * Why：RN host mock 把 accessibilityLabel 存进 data-prop-accessibilitylabel（非原生 for/id 关联），
   * getByLabelText 无法识别，需按属性查询（同 history.test.tsx 按文本定位 host 节点的范式）。
   */
  function findByAccessibilityLabel(container: HTMLElement, label: string): Element | undefined {
    return Array.from(container.querySelectorAll('[data-rn-host="Pressable"]')).find(
      (el) => el.getAttribute('data-prop-accessibilitylabel') === label,
    );
  }

  it('页头标题「订单详情」存在，返回按钮 a11y label=返回', () => {
    const { getByText, container } = renderPage();

    expect(getByText('订单详情')).toBeTruthy();
    // SimplePageHeader 返回按钮 accessibilityLabel=backLabel
    expect(findByAccessibilityLabel(container, '返回')).toBeTruthy();
  });

  it('点返回触发 goBack（useGoBack 由 SimplePageHeader 内置，fallbackHref=/order/history）', () => {
    const { container } = renderPage();

    const backBtn = findByAccessibilityLabel(container, '返回');
    expect(backBtn).toBeTruthy();
    fireEvent.click(backBtn as Element);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
