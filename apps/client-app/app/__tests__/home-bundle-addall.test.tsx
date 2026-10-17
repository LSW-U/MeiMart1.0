/**
 * 批3 B8 常买组合 —— home 一键整包加购
 *
 * 验证：
 *   1. bundle（seed+items）非空 → 组合板块渲染（标题 + 各 item 卡 + 整包按钮）
 *   2. 点整包按钮 → 逐个 addToCart（seed 在前）→ 全成才 toast.success 且带 count
 *   3. 中途失败 → toast.error 且停止（不继续加后续 item）
 *   4. 空组合（seed null / 门禁关）→ 板块不渲染
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import HomePage from '../(main)/home';
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

const SEED = product('b1');
const ITEMS = [product('b2'), product('b3')];
let mockBundle: { seed: Product | null; items: Product[]; coOrderCount: number } | undefined = {
  seed: SEED,
  items: ITEMS,
  coOrderCount: 3,
};
// mutateAsync 逐个调用记录；个别用例注入失败
const mockMutateAsync = jest.fn();

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

const mockT = jest.fn((key: string, opts?: { count?: number }) =>
  opts?.count !== undefined ? `${key}:${opts.count}` : key,
);
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT }),
}));

jest.mock('@/services/queries/useNotifications', () => ({
  useUnreadCount: () => ({ data: 0 }),
}));

jest.mock('@/services/queries/useCatalog', () => ({
  useCategories: () => ({ data: [] }),
  useBanners: () => ({ data: [] }),
}));

jest.mock('@/services/queries/useProducts', () => ({
  useRecommendationsInfinite: () => ({
    data: { pages: [[]] },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    isFetching: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
    hasNextPage: false,
  }),
  useBuyAgain: () => ({ data: [] }),
  useFrequentBundle: () => ({ data: mockBundle }),
}));

jest.mock('@/services/queries/usePromotions', () => ({
  usePromotions: () => ({ data: [] }),
}));

jest.mock('@/services/queries/useCart', () => ({
  useCartCount: () => ({ data: 0 }),
  useAddToCart: () => ({ mutateAsync: (...args: unknown[]) => mockMutateAsync(...args) }),
}));

jest.mock('@/store/toastStore', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  mockBundle = { seed: SEED, items: ITEMS, coOrderCount: 3 };
  mockMutateAsync.mockResolvedValue(undefined);
});

describe('批3 B8 常买组合一键整包加购', () => {
  it('组合非空 → 板块渲染（标题 + seed/items 卡 + 整包按钮）', () => {
    render(<HomePage />, { wrapper });
    expect(screen.getByText('home.bundleTitle')).toBeTruthy();
    expect(screen.getByTestId('bundle-card-b1')).toBeTruthy();
    expect(screen.getByTestId('bundle-card-b2')).toBeTruthy();
    expect(screen.getByTestId('bundle-card-b3')).toBeTruthy();
    expect(screen.getByTestId('home-bundle-add-all')).toBeTruthy();
  });

  it('点整包按钮 → 逐个加购（seed 在前）→ 成功 toast 带 count', async () => {
    render(<HomePage />, { wrapper });
    fireEvent.press(screen.getByTestId('home-bundle-add-all'));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('home.bundleAdded:3');
    });
    expect(mockMutateAsync).toHaveBeenCalledTimes(3);
    expect(
      mockMutateAsync.mock.calls.map((c) => (c[0] as { product: Product }).product.id),
    ).toEqual(['b1', 'b2', 'b3']);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('中途失败 → toast.error 且停止（不继续加后续）', async () => {
    mockMutateAsync.mockImplementation(({ product: p }: { product: Product }) =>
      p.id === 'b2' ? Promise.reject(new Error('SOLD_OUT')) : Promise.resolve(undefined),
    );
    render(<HomePage />, { wrapper });
    fireEvent.press(screen.getByTestId('home-bundle-add-all'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    expect(mockMutateAsync).toHaveBeenCalledTimes(2); // b1 成功、b2 失败即停
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('批3 P3-3 修复：部分成功 → 错误 toast 后补部分成功计数提示', async () => {
    mockMutateAsync.mockImplementation(({ product: p }: { product: Product }) =>
      p.id === 'b2' ? Promise.reject(new Error('SOLD_OUT')) : Promise.resolve(undefined),
    );
    render(<HomePage />, { wrapper });
    fireEvent.press(screen.getByTestId('home-bundle-add-all'));
    // 先等错误 toast（错误先于 info 发出），再断言 info 的插值参数
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(toast.info).toHaveBeenCalled();
    });
    // t mock 返回纯 key（done/failed 无 count 不插值）；断言调用参数含部分成功计数（取最后一次匹配调用）
    const partialCall = mockT.mock.calls.find((c) => c[0] === 'home.bundlePartialAdded');
    expect(partialCall).toBeDefined();
    expect(partialCall![1]).toEqual({ done: 1, failed: 2 });
  });

  it('空组合（seed null）→ 板块不渲染', () => {
    mockBundle = { seed: null, items: [], coOrderCount: 0 };
    render(<HomePage />, { wrapper });
    expect(screen.queryByText('home.bundleTitle')).toBeNull();
    expect(screen.queryByTestId('home-bundle-add-all')).toBeNull();
  });
});
