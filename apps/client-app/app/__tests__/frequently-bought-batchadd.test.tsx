/**
 * 业务增强批1 5.4 — frequently-bought 一键加购全部
 *
 * 验证：
 *   1. 按钮渲染（非空态可见 + a11y label）；空态不显示
 *   2. 全成 → 「成功加购 X 项」toast
 *   3. 部分成 → 跳过失败项继续加可用项 + 「X 项成功，Y 项失败已跳过」toast
 *   4. 全败 → 「加购失败」toast
 *   5. 进行中防连点（disabled）
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import FrequentlyBoughtPage from '../product/frequently-bought';
import { toast } from '@/store/toastStore';
import type { Product } from '@/types';

function product(id: string, stock?: number): Product {
  return {
    id,
    name: { en: `P${id}`, zh: `商品${id}`, tet: `P${id}`, pt: `P${id}` },
    price: 10,
    image: '',
    category: 'c001',
    ...(stock !== undefined ? { stock } : {}),
  } as Product;
}

let mockProducts: Product[] = [product('a2'), product('a1')];
// mutateAsync mock：按 product.id 可编程成败（成功 resolve / 失败 reject）
const mockMutateAsync = jest.fn();
let mockIsAuthenticated = true;

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => key }),
}));

jest.mock('@/services/queries/useProducts', () => ({
  useBuyAgain: () => ({
    data: require('./frequently-bought-batchadd.test.tsx').__products,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/services/queries/useCart', () => ({
  useAddToCart: () => ({ mutateAsync: mockMutateAsync, mutate: jest.fn() }),
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
    HorizontalProductCard: ({ product }: { product: Product }) => (
      <View testID={`hpc-${product.id}`}>
        <Text>{(product.name as { en: string }).en}</Text>
        <Pressable testID={`add-${product.id}`} />
      </View>
    ),
  };
});

// 工厂外引桥（jest mock 工厂禁外引，非 mock 前缀命名导出）
export function __setProducts(list: Product[]) {
  mockProducts = list;
}

// 需在 mock 工厂内读取 → 用 getter（require 回环取本文件导出）
Object.defineProperty(require('./frequently-bought-batchadd.test.tsx'), '__products', {
  get() {
    return mockProducts;
  },
  configurable: true,
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  mockProducts = [product('a2'), product('a1')];
  mockIsAuthenticated = true;
  mockMutateAsync.mockImplementation(({ product: p }: { product: Product }) => Promise.resolve());
});

describe('业务增强批1 5.4 一键加购全部', () => {
  it('非空态 → 按钮渲染（a11y label），空态 → 不渲染', () => {
    const { unmount } = render(<FrequentlyBoughtPage />, { wrapper });
    expect(screen.getByTestId('fb-add-all')).toBeTruthy();
    expect(screen.getByTestId('fb-add-all').props.accessibilityLabel).toBe('home.bundleAddAll');
    unmount();
    mockProducts = [];
    render(<FrequentlyBoughtPage />, { wrapper });
    expect(screen.queryByTestId('fb-add-all')).toBeNull();
  });

  it('全成 → 逐项 mutateAsync + 「成功加购 X 项」toast', async () => {
    render(<FrequentlyBoughtPage />, { wrapper });
    fireEvent.press(screen.getByTestId('fb-add-all'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    expect(mockMutateAsync).toHaveBeenCalledTimes(2);
    expect(toast.success).toHaveBeenCalledWith('home.frequentlyBoughtAllAdded');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('部分成 → 跳过失败项继续加可用项 + X/Y 计数 toast', async () => {
    mockMutateAsync.mockImplementation(({ product: p }: { product: Product }) =>
      p.id === 'a2' ? Promise.reject(new Error('SOLD_OUT')) : Promise.resolve(),
    );
    render(<FrequentlyBoughtPage />, { wrapper });
    fireEvent.press(screen.getByTestId('fb-add-all'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    // a2 失败被跳过，a1 仍被调用（continue 语义）
    expect(mockMutateAsync).toHaveBeenCalledTimes(2);
    expect(toast.success).toHaveBeenCalledWith('home.frequentlyBoughtPartialAdded');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('全败 → 「加购失败」toast，不逐条弹错', async () => {
    mockMutateAsync.mockRejectedValue(new Error('Network Error'));
    render(<FrequentlyBoughtPage />, { wrapper });
    fireEvent.press(screen.getByTestId('fb-add-all'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(toast.error).toHaveBeenCalledWith('home.frequentlyBoughtAllFailed');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('进行中防连点：disabled + 再点无效', async () => {
    let resolveFirst: (v: unknown) => void;
    mockMutateAsync.mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)));
    render(<FrequentlyBoughtPage />, { wrapper });
    fireEvent.press(screen.getByTestId('fb-add-all'));
    // 第一项 in-flight：按钮 disabled
    await waitFor(() =>
      expect(screen.getByTestId('fb-add-all').props.accessibilityState?.disabled).toBe(true),
    );
    resolveFirst!(undefined);
    await waitFor(() =>
      expect(screen.getByTestId('fb-add-all').props.accessibilityState?.disabled).toBe(false),
    );
  });
});
