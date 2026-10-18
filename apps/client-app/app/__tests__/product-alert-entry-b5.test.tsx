import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductDetailPage from '../product/[id]';
import { toast } from '@/store/toastStore';
/**
 * 商品详情页 C7/C8 提醒订阅入口 — 客户画像批5（方案v2 §三 批5 2026-10-18）
 *
 * 覆盖：
 *   1. 有货商品 → 入口渲染「降价提醒」（PRICE_ALERT）
 *   2. 缺货商品 → 入口渲染「到货提醒」（RESTOCK_ALERT）
 *   3. 已订阅 → 高亮态（subscribed）+ 点击走 DELETE（toggle off）
 *   4. 匿名 → 点击引导登录（toast.info + router.push /(auth)/login），不 mutate
 *   5. 埋点：进详情页 trackProductView 调用（G2 VIEW）
 */
const mockTrackProductView = jest.fn();
jest.mock('@/services/behavior', () => ({
  trackProductView: (...args: unknown[]) => mockTrackProductView(...args),
  trackSearchClick: jest.fn(),
}));

const mockUseAlertSubs = jest.fn();
const mockToggleMutate = jest.fn();
jest.mock('@/services/queries/useSubscriptions', () => ({
  useAlertSubscriptions: (...args: unknown[]) => mockUseAlertSubs(...args),
  useToggleAlertSubscription: () => ({ mutate: mockToggleMutate, isPending: false }),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: 'p001' }),
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('@/hooks/useSafeBack', () => ({ useSafeBack: () => jest.fn() }));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

jest.mock('@/i18n', () => ({ useLocalizer: () => (text?: { en?: string }) => text?.en ?? '' }));

jest.mock('@/services/api', () => ({ isMockMode: false }));

jest.mock('expo-blur', () => ({
  BlurView: (props: { children?: React.ReactNode }) => props.children ?? null,
}));

jest.mock('@/services/queries/useProducts', () => ({
  useProduct: () => ({
    data: {
      id: 'p001',
      name: { en: 'Apple', zh: '苹果', tet: 'Apple', pt: 'Maçã' },
      price: 25.9,
      image: 'https://cdn.example.com/main.jpg',
      category: 'c002',
      salesCount: 100,
      stock: 85,
      description: { en: 'd', zh: 'd', tet: 'd', pt: 'd' },
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useProducts: () => ({ data: [] }),
  useWarehouseAvailability: () => ({ data: null }),
}));

jest.mock('@/services/queries/useCart', () => ({
  useCart: () => ({ data: null }),
  useAddToCart: () => ({ mutate: jest.fn() }),
}));

jest.mock('@/services/queries/useFavorites', () => ({
  useFavorites: () => ({ data: [] }),
  useToggleFavorite: () => ({ mutate: jest.fn() }),
}));

jest.mock('@/services/queries/useAddress', () => ({
  useAddresses: () => ({ data: [] }),
}));

jest.mock('@/services/queries/useReviews', () => ({
  useReviews: () => ({
    data: {
      reviews: [],
      summary: {
        avg: 0,
        count: 0,
        distribution: [5, 4, 3, 2, 1].map((s) => ({ stars: s, count: 0, percent: 0 })),
      },
    },
    isLoading: false,
  }),
  consumeLastSubmittedReviewId: () => null,
}));

const mockIsAuthenticated = { value: true };
jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: { isAuthenticated: boolean }) => unknown) =>
    selector({ isAuthenticated: mockIsAuthenticated.value }),
}));

jest.mock('@/store/toastStore', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })
    }
  >
    <ThemeProvider>{children}</ThemeProvider>
  </QueryClientProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  mockIsAuthenticated.value = true;
  mockUseAlertSubs.mockReturnValue({ data: [] });
});

describe('详情页提醒订阅入口（批5 C7/C8）', () => {
  it('有货商品 → 降价提醒入口渲染，类型 PRICE_ALERT', () => {
    render(<ProductDetailPage />, { wrapper });
    const entry = screen.getByTestId('product-alert-entry');
    expect(entry).toBeTruthy();
    // 有货 → kind=price；未订阅态文案
    expect(screen.getByText('product.priceAlert')).toBeTruthy();
    expect(mockUseAlertSubs).toHaveBeenCalledWith('PRICE_ALERT');
  });

  it('缺货商品 → 到货提醒入口，类型 RESTOCK_ALERT', () => {
    // useProduct stock=0 缺货：重 mock data（mock 模块级函数替换，afterEach 用例末恢复）
    const mod = jest.requireMock('@/services/queries/useProducts') as {
      useProduct: () => unknown;
    };
    const originalUseProduct = mod.useProduct;
    mod.useProduct = () => ({
      data: {
        id: 'p001',
        name: { en: 'Apple', zh: '苹果', tet: 'Apple', pt: 'Maçã' },
        price: 25.9,
        image: 'img',
        category: 'c002',
        salesCount: 0,
        stock: 0,
        description: undefined,
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    try {
      render(<ProductDetailPage />, { wrapper });
      expect(screen.getByText('product.restockAlert')).toBeTruthy();
      expect(mockUseAlertSubs).toHaveBeenCalledWith('RESTOCK_ALERT');
    } finally {
      mod.useProduct = originalUseProduct;
    }
  });

  it('已订阅 → 高亮态 + 点击 toggle 走 DELETE（subscriptionId 传 id）', () => {
    mockUseAlertSubs.mockReturnValue({
      data: [
        {
          id: 'sub1',
          productId: 'p001',
          type: 'PRICE_ALERT',
          cycleDays: 30,
          enabled: true,
          lastRemindedAt: null,
          priceAtSub: 2590,
          createdAt: 'x',
          updatedAt: 'x',
        },
      ],
    });
    render(<ProductDetailPage />, { wrapper });
    expect(screen.getByText('product.priceAlertOn')).toBeTruthy();
    fireEvent.press(screen.getByTestId('product-alert-entry'));
    expect(mockToggleMutate).toHaveBeenCalledWith(
      { productId: 'p001', subscriptionId: 'sub1' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('匿名 → 点击引导登录（toast.info + 跳登录页），不 mutate', () => {
    mockIsAuthenticated.value = false;
    render(<ProductDetailPage />, { wrapper });
    fireEvent.press(screen.getByTestId('product-alert-entry'));
    expect(toast.info).toHaveBeenCalledWith('product.alertLoginRequired');
    expect(jest.requireMock('expo-router').router.push).toHaveBeenCalledWith('/(auth)/login');
    expect(mockToggleMutate).not.toHaveBeenCalled();
  });

  it('G2 埋点：进详情页 trackProductView(productId) 调用', () => {
    render(<ProductDetailPage />, { wrapper });
    expect(mockTrackProductView).toHaveBeenCalledWith('p001');
  });
});
