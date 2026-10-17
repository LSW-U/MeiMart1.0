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
import FrequentlyBoughtPage from '../product/frequently-bought';
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
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/services/queries/useProducts', () => ({
  useBuyAgain: (opts?: { limit?: number; enabled?: boolean }) => {
    // 工厂禁外引（非 mock 前缀），改走 jest.requireActual 注入的 setter
    require('./frequently-bought-b1.test.tsx').__setOpts(opts);
    return mockBuyAgain;
  },
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
    mockBuyAgain = { isLoading: false, isError: true, refetch: jest.fn() };
    render(<FrequentlyBoughtPage />, { wrapper });
    expect(screen.getByText('errors.products')).toBeTruthy();
    // ErrorState 重试按钮（accessibilityRole button，页内两个：header 返回 + 重试）→ 全点，refetch 被触发
    const retry = screen.root
      .findAll((n) => n.props.accessibilityRole === 'button')
      .find(
        (n) => typeof n.props.onPress === 'function' && String(n.props.onPress).includes('refetch'),
      );
    fireEvent.press(
      retry ?? screen.root.findAll((n) => n.props.accessibilityRole === 'button')[1]!,
    );
    expect(mockBuyAgain.refetch).toHaveBeenCalled();
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

  it('loading 态 → LoadingOverlay（progressbar）', () => {
    mockBuyAgain = { isLoading: true };
    render(<FrequentlyBoughtPage />, { wrapper });
    expect(screen.root.findByProps({ accessibilityRole: 'progressbar' })).toBeTruthy();
  });
});
