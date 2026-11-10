/**
 * 批3 B1 常购清单页 —— 渲染 / 加购 / 三态 / 空态
 *
 * 验证：
 *   1. 有数据 → 排序提示 + 商品列表渲染（P3-1：前端不重排，按 useBuyAgain 返回顺序直出）
 *   2. 点加购 → 成功 toast；SOLD_OUT / STOCK_EXCEEDED 三态错误映射
 *   3. loading / error / 空态（登录与未登录文案不同）
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { View as RNView } from 'react-native';
import { ThemeProvider } from '@/theme';
import FrequentlyBoughtPage from '../product/history';
import { toast } from '@/store/toastStore';
import type { Product } from '@/types';

function product(id: string): Product {
  return {
    id,
    name: { en: `P${id}`, zh: `商品${id}`, tet: `P${id}`, pt: `P${id}` },
    price: 10,
    image: '',
    category: 'c001',
  } as Product;
}

let mockBuyAgain: {
  data?: Product[];
  isLoading?: boolean;
  isError?: boolean;
  refetch?: () => void;
} = { data: [product('a2'), product('a1')], isLoading: false, isError: false };
// 批3 P2-2：捕获页面调用 useBuyAgain 时的 opts（enabled 断言用）
const mockBuyAgainOpts: { limit?: number; enabled?: boolean } = {};
const mockAddMutate = jest.fn();
let mockIsAuthenticated = false;

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/services/queries/useProducts', () => ({
  useBuyAgain: (opts?: { limit?: number; enabled?: boolean }) => {
    // 工厂禁外引（非 mock 前缀），改走 jest.requireActual 注入的 setter
    require('./product-history-tab.test.tsx').__setOpts(opts);
    return mockBuyAgain;
  },
  // 20261109 融合页：页面新增浏览历史 tab 消费，mock 补齐避免 undefined 崩
  useProductsByIds: () => ({ data: [], isLoading: false, isError: false, refetch: jest.fn() }),
}));

jest.mock('@/services/queries/useCart', () => ({
  useAddToCart: () => ({ mutate: mockAddMutate }),
}));

jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: { isAuthenticated: boolean }) => unknown) =>
    selector({ isAuthenticated: mockIsAuthenticated }),
}));

jest.mock('@/store/toastStore', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

jest.mock('@/components/business/HorizontalProductCard/HorizontalProductCard', () => {
  const { View, Text, Pressable } = require('react-native');
  return {
    HorizontalProductCard: ({
      product,
      onAddToCart,
      onPress,
    }: {
      product: Product;
      onAddToCart: (p: Product) => void;
      onPress: (p: Product) => void;
    }) => (
      <View testID={`hpc-${product.id}`}>
        <Text>{(product.name as { en: string }).en}</Text>
        <Pressable onPress={() => onAddToCart(product)} testID={`add-${product.id}`} />
        <Pressable onPress={() => onPress(product)} testID={`press-${product.id}`} />
      </View>
    ),
  };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

// 工厂外引桥（jest 要求 mock 前缀命名导出）
export function __setOpts(opts?: { limit?: number; enabled?: boolean }) {
  mockBuyAgainOpts.limit = opts?.limit;
  mockBuyAgainOpts.enabled = opts?.enabled;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBuyAgain = { data: [product('a2'), product('a1')], isLoading: false, isError: false };
  mockBuyAgainOpts.limit = undefined;
  mockBuyAgainOpts.enabled = undefined;
  mockIsAuthenticated = false;
});

describe('批3 B1 常购清单页', () => {
  it('有数据 → 排序提示 + 列表按返回顺序直出（前端不重排）', () => {
    mockIsAuthenticated = true;
    const { UNSAFE_getAllByType } = render(<FrequentlyBoughtPage />, { wrapper });
    expect(screen.getByText('home.frequentlyBoughtOrderHint')).toBeTruthy();
    // useBuyAgain 返回 [a2, a1]，前端不重排 → host 壳渲染序 a2 在 a1 前
    const ids = UNSAFE_getAllByType(RNView)
      .map((v) => v.props.testID)
      .filter(Boolean);
    expect(ids.indexOf('hpc-a2')).toBeLessThan(ids.indexOf('hpc-a1'));
  });

  it('点加购 → useAddToCart.mutate 被调用；成功回调 toast.success', () => {
    mockIsAuthenticated = true;
    render(<FrequentlyBoughtPage />, { wrapper });
    fireEvent.press(screen.getByTestId('add-a2'));
    expect(mockAddMutate).toHaveBeenCalledWith(
      expect.objectContaining({ product: expect.objectContaining({ id: 'a2' }), quantity: 1 }),
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    // 取出 onSuccess 执行 → 成功 toast
    const opts = mockAddMutate.mock.calls[0][1];
    opts.onSuccess();
    expect(toast.success).toHaveBeenCalledWith('product.addedToCart');
  });

  it('错误三态映射：SOLD_OUT → product.soldOut', () => {
    mockIsAuthenticated = true;
    render(<FrequentlyBoughtPage />, { wrapper });
    fireEvent.press(screen.getByTestId('add-a1'));
    const opts = mockAddMutate.mock.calls[0][1];
    opts.onError(new Error('SOLD_OUT'));
    expect(toast.error).toHaveBeenCalledWith('product.soldOut');
  });

  it('错误三态映射：STOCK_EXCEEDED → product.stockExceeded', () => {
    mockIsAuthenticated = true;
    render(<FrequentlyBoughtPage />, { wrapper });
    fireEvent.press(screen.getByTestId('add-a1'));
    mockAddMutate.mock.calls[0][1].onError(new Error('STOCK_EXCEEDED'));
    expect(toast.error).toHaveBeenCalledWith('product.stockExceeded');
  });

  it('error 态 → ErrorState + 重试触发 refetch', () => {
    const refetch = jest.fn();
    mockBuyAgain = { isLoading: false, isError: true, refetch };
    render(<FrequentlyBoughtPage />, { wrapper });
    expect(screen.getByText('errors.products')).toBeTruthy();
    // 20261109 融合页：常购 tab error 分支渲染 TabBar（2 个 tab 按钮）+ header 返回 + 重试。
    // 重试 = error 态下唯一含「buy-again refetch」闭包的按钮——直接点 ErrorState 内 Button
    // （label = common.retry），不再按 button 下标猜（TabBar 加位后原 [1] 落到 tab 上）
    const retryBtn = screen.root
      .findAll((n) => n.props.accessibilityRole === 'button')
      .find((n) => n.props.accessibilityLabel === 'common.retry');
    expect(retryBtn).toBeTruthy();
    fireEvent.press(retryBtn!);
    // fake-green 门禁补强：断言 refetch 被调且入参为空（真实重试语义，非误触任意按钮）
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(refetch).toHaveBeenCalledWith();
  });

  it('空态（未登录）→ 引导登录文案 + 去逛逛', () => {
    mockBuyAgain = { data: [], isLoading: false, isError: false };
    render(<FrequentlyBoughtPage />, { wrapper });
    expect(screen.getByText('home.frequentlyBoughtEmpty')).toBeTruthy();
    expect(screen.getByText('home.frequentlyBoughtEmptyDescGuest')).toBeTruthy();
  });

  it('批3 P2-2 修复：匿名分流——未登录传 enabled: false 不请求，直接渲染 guest 空态', () => {
    // 页面匿名时 hook 应带 enabled: isAuthenticated=false 调用（不白打请求）
    render(<FrequentlyBoughtPage />, { wrapper });
    expect(screen.getByText('home.frequentlyBoughtEmptyDescGuest')).toBeTruthy();
    // mock hook 收到的 opts 断言：enabled false
    expect(mockBuyAgainOpts.enabled).toBe(false);
  });

  it('批3 P2-2 修复：已登录 enabled: true 照常请求', () => {
    mockIsAuthenticated = true;
    render(<FrequentlyBoughtPage />, { wrapper });
    expect(mockBuyAgainOpts.enabled).toBe(true);
  });

  it('空态（已登录）→ 常购空态文案', () => {
    mockIsAuthenticated = true;
    mockBuyAgain = { data: [], isLoading: false, isError: false };
    render(<FrequentlyBoughtPage />, { wrapper });
    expect(screen.getByText('home.frequentlyBoughtEmptyDesc')).toBeTruthy();
  });

  it('loading 态 → PageSkeleton 骨架屏（批2 阶段2 换组件）', () => {
    mockBuyAgain = { isLoading: true };
    render(<FrequentlyBoughtPage />, { wrapper });
    expect(screen.root.findByProps({ testID: 'page-skeleton' })).toBeTruthy();
  });
});

// —— 20261109 融合页新增：浏览历史 tab（B1 本地 AsyncStorage） ——
const mockHistoryEntries = { list: [] as { id: string; viewedAt: number }[], loaded: true };
const mockClearHistory = jest.fn();
jest.mock('@/hooks/useBrowseHistory', () => ({
  useBrowseHistory: () => ({
    entries: require('./product-history-tab.test.tsx').__histList,
    loaded: true,
    record: jest.fn(),
    clear: require('./product-history-tab.test.tsx').__clearHist,
  }),
}));
Object.defineProperty(require('./product-history-tab.test.tsx'), '__histList', {
  get: () => mockHistoryEntries.list,
});
Object.defineProperty(require('./product-history-tab.test.tsx'), '__clearHist', {
  get: () => mockClearHistory,
});

const mockViewedIds: string[][] = [];
const mockProductFn = (id: string): Product =>
  ({
    id,
    name: { en: `P${id}`, zh: `商品${id}`, tet: `P${id}`, pt: `P${id}` },
    price: 10,
    image: '',
    category: 'c001',
  }) as Product;
jest.mock('@/services/queries/useProducts', () => ({
  useBuyAgain: (opts?: { limit?: number; enabled?: boolean }) => {
    require('./product-history-tab.test.tsx').__setOpts(opts);
    return mockBuyAgain;
  },
  useProductsByIds: (ids: string[]) => {
    mockViewedIds.push([...ids]);
    return {
      data: mockHistoryEntries.list
        .map((e) => mockProductFn(e.id))
        .filter((p) => ids.includes(p.id)),
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    };
  },
}));

describe('融合页浏览历史 tab（B1 本地实现）', () => {
  beforeEach(() => {
    mockHistoryEntries.list = [];
    mockViewedIds.length = 0;
    mockClearHistory.mockClear();
  });

  it('切换到浏览历史 tab → useProductsByIds 收到本地 entries 的 id 列表', () => {
    mockHistoryEntries.list = [
      { id: 'a2', viewedAt: 2 },
      { id: 'a1', viewedAt: 1 },
    ];
    render(<FrequentlyBoughtPage />, { wrapper });
    fireEvent.press(screen.getByTestId('history-tab-viewed'));
    // 最近浏览在前：entries 顺序即请求顺序（getProductsByIds 按 ids 映射保序）
    expect(mockViewedIds.at(-1)).toEqual(['a2', 'a1']);
    expect(screen.getByText('Pa2')).toBeTruthy();
  });

  it('常购 tab 活跃时不渲染浏览历史卡片（tab 隔离）', () => {
    mockHistoryEntries.list = [{ id: 'a1', viewedAt: 1 }];
    render(<FrequentlyBoughtPage />, { wrapper });
    // mock 工厂每次渲染都执行（enabled 守卫在真 hook 内部，mock 无此语义），
    // tab 隔离取证改为渲染面：常购 tab 下不出现历史 tab 的商品卡与清空钮
    expect(screen.queryByTestId('history-clear')).toBeNull();
    expect(screen.queryByText('Pa1')).toBeNull();
  });

  it('浏览历史空态 → 无记录文案 + 去逛逛', () => {
    render(<FrequentlyBoughtPage />, { wrapper });
    fireEvent.press(screen.getByTestId('history-tab-viewed'));
    expect(screen.getByText('product.historyEmpty')).toBeTruthy();
    expect(screen.getByText('home.frequentlyBoughtBrowse')).toBeTruthy();
  });

  it('清空 → useBrowseHistory.clear 调用 + toast 成功', () => {
    mockHistoryEntries.list = [{ id: 'a1', viewedAt: 1 }];
    render(<FrequentlyBoughtPage />, { wrapper });
    fireEvent.press(screen.getByTestId('history-tab-viewed'));
    fireEvent.press(screen.getByTestId('history-clear'));
    expect(mockClearHistory).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('product.historyCleared');
  });
});
