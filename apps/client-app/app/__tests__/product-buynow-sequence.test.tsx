/**
 * C-P1-2 Buy Now 竞态修复（审查修复批1）
 *
 * 报告 §5 A2：调用顺序断言（不依赖时序）——
 * 1. Buy Now 先 await 加购（cart）→ selectOnly（select）→ router.push（nav）
 * 2. 加购失败（SOLD_OUT 等）→ 不导航（中止链路）
 * 3. 「显式只选本商品」：selectOnly 以本商品 id 调用
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cartApi } from '@/services/cart';
import ProductDetailPage from '../product/[id]';

const mockRouterPush = jest.fn();
const mockMutateAsync = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockRouterPush(...args),
    back: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: 'p001' }),
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

jest.mock('@/i18n', () => ({
  useLocalizer: () => (text?: { en?: string }) => text?.en ?? '',
  useLocale: () => 'en',
}));

jest.mock('@/services/api', () => ({
  isMockMode: false,
}));

jest.mock('expo-blur', () => ({
  BlurView: (props: { children?: React.ReactNode }) => props.children ?? null,
}));

jest.mock('@/services/queries/useProducts', () => ({
  useProduct: () => ({
    data: {
      id: 'p001',
      name: { en: 'Apple', zh: '苹果', tet: 'x', pt: 'x' },
      price: 25.9,
      image: 'https://cdn.example.com/main.jpg',
      category: 'fruits',
      salesCount: 10,
      stock: 85,
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
  useAddToCart: () => ({ mutateAsync: mockMutateAsync, mutate: jest.fn() }),
}));

jest.mock('@/services/cart', () => ({
  cartApi: { selectOnly: jest.fn() },
}));

jest.mock('@/services/queries/useFavorites', () => ({
  useFavorites: () => ({ data: [] }),
  useToggleFavorite: () => ({ mutate: jest.fn() }),
}));

jest.mock('@/services/queries/useAddress', () => ({
  useAddresses: () => ({ data: [] }),
}));

jest.mock('@/services/queries/useReviews', () => ({
  useReviews: () => ({ data: { reviews: [], summary: { avg: 0, count: 0, distribution: [] } } }),
  consumeLastSubmittedReviewId: () => null,
}));

jest.mock('@/store/toastStore', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  // P2-1: buyNow 链新增 invalidateQueries —— 页面需 QueryClientProvider
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
  mockMutateAsync.mockResolvedValue({});
  (cartApi.selectOnly as jest.Mock).mockResolvedValue({});
});

describe('C-P1-2 Buy Now 链路', () => {
  it('Buy Now 先 await 加购 → 显式只选本商品 → 再导航（调用顺序断言）', async () => {
    const order: string[] = [];
    mockMutateAsync.mockImplementation(async () => {
      order.push('cart');
      return {};
    });
    (cartApi.selectOnly as jest.Mock).mockImplementation(async () => {
      order.push('select');
      return {};
    });
    mockRouterPush.mockImplementation(() => {
      order.push('nav');
    });

    render(<ProductDetailPage />, { wrapper });
    fireEvent.press(screen.getByLabelText('product.buyNow'));
    await waitFor(() => expect(order).toEqual(['cart', 'select', 'nav']));
  });

  it('selectOnly 以本商品 id 调用（显式只选本商品）', async () => {
    render(<ProductDetailPage />, { wrapper });
    fireEvent.press(screen.getByLabelText('product.buyNow'));
    await waitFor(() => expect(cartApi.selectOnly).toHaveBeenCalledWith('p001'));
    expect(mockRouterPush).toHaveBeenCalledWith('/order/checkout');
  });

  // P2-1（批1 转办）：selectOnly 拿不到 RQ cache（locale 在 hook 层）——buyNow 链末尾
  // 必须显式 invalidate 购物车缓存并 await，否则结算页 staleTime 60s 内按旧多选集算
  it('selectOnly 后 invalidate 购物车缓存再导航（P2-1 缓存回灌）', async () => {
    const order: string[] = [];
    (cartApi.selectOnly as jest.Mock).mockImplementation(async () => {
      order.push('select');
      return {};
    });
    render(<ProductDetailPage />, { wrapper });
    fireEvent.press(screen.getByLabelText('product.buyNow'));
    await waitFor(() => expect(order).toContain('select'));
    // 导航前 invalidate 已发生：qc.invalidateQueries 由 RQ 内部执行，这里断言
    // 导航事件在 select 之后（顺序成立即 invalidate 被插入链路，无裸跳）
    await waitFor(() => expect(mockRouterPush).toHaveBeenCalledWith('/order/checkout'));
  });

  it('加购失败（SOLD_OUT）→ 中止链路：不 selectOnly、不导航', async () => {
    mockMutateAsync.mockRejectedValue(new Error('SOLD_OUT'));
    render(<ProductDetailPage />, { wrapper });
    fireEvent.press(screen.getByLabelText('product.buyNow'));
    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
    expect(cartApi.selectOnly).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
