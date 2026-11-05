/**
 * 1.2 favorites 网格虚拟化测试（业务增强批2，P-v2-2 分列行化 + V2-07 渲染计数断言）
 *
 * 覆盖：
 * 1. P0 渲染计数断言：大收藏集（60 项 → 30 行）下首屏渲染行数不随总量全量增长
 *    （FlatList 虚拟化窗口，仅可视窗 + 缓冲；ScrollView 全量渲染时代 60 卡全渲染）
 * 2. 对称网格行化（20261105 方案甲，用户拍板）：每行 = 原序相邻两张卡 [i, i+1]，
 *    行序 = 数据序（瀑布流分列算法 splitMasonryBalanced 已弃用，favorites 不再引用）
 * 3. 奇数项收尾行：一侧可空（右列缺卡不炸、不渲染空卡）
 * 4. 列表态不受影响：切列表后 FlatList data 仍为 Product[]（HorizontalProductCard）
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '@/theme';
import * as favoritesQueries from '@/services/queries/useFavorites';
import { useAuthStore } from '@/store/authStore';
import FavoritesPage from '../favorites';
import type { Product } from '@/types';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number; name?: string; q?: string }) => {
      if (opts?.name !== undefined) return `${key}:${opts.name}`;
      if (opts?.count !== undefined) return `${key}:${opts.count}`;
      return key;
    },
  }),
}));

jest.mock('@/services/queries/useFavorites', () => ({
  useFavorites: jest.fn(),
  useRemoveFavorites: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/services/queries/useCart', () => ({
  useAddToCart: () => ({ mutate: jest.fn() }),
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

// Why: RN 壳无原生测量，jsdom 视口高度 0 → FlatList 虚拟化窗口退化为只渲染 initialNumToRender，
// 恰好让「渲染节点数不随总量增长」可断言（真机为可视窗+缓冲，同性质）。
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const mkProduct = (i: number): Product => ({
  id: `vp${String(i).padStart(3, '0')}`,
  name: { en: `P${i}` },
  price: 1 + i,
  image: '',
  category: 'c001',
  salesCount: i,
});

// 60 项收藏（列宽均衡分列后 30 行），验证渲染计数不随总量全量增长
const bigFavorites: Product[] = Array.from({ length: 60 }, (_, i) => mkProduct(i));
// 3 项（奇数）：收尾行一侧为空
const oddFavorites: Product[] = [mkProduct(0), mkProduct(1), mkProduct(2)];

const mockFavorites = (data: Product[] | undefined) => {
  (favoritesQueries.useFavorites as unknown as jest.Mock).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
};

const countMasonryCards = (queryAllByTestId: (id: string | RegExp) => unknown[]): number =>
  queryAllByTestId(/^favorites-masonry-vp\d+$/).length;

beforeEach(() => {
  AsyncStorage.clear();
  useAuthStore.setState({ isAuthenticated: true });
  jest.clearAllMocks();
});

describe('favorites 网格虚拟化（1.2 分列行化）', () => {
  it('P0 渲染计数断言：60 项收藏首屏渲染卡数远小于总量（虚拟化窗口，非全量）', () => {
    mockFavorites(bigFavorites);
    const { queryAllByTestId } = render(<FavoritesPage />, { wrapper });
    const rendered = countMasonryCards(queryAllByTestId);
    // 全量渲染会是 60；虚拟化下首屏只渲染 initialNumToRender=6 行 × 2 卡 = 12（含两侧成对）
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThanOrEqual(24);
    expect(rendered).toBeLessThan(bigFavorites.length);
  });

  it('渲染计数不随收藏量增长：120 项与 60 项首屏渲染卡数同窗（不翻倍）', () => {
    mockFavorites(bigFavorites);
    const small = render(<FavoritesPage />, { wrapper });
    const count60 = countMasonryCards(small.queryAllByTestId);
    small.unmount();
    const big120: Product[] = Array.from({ length: 120 }, (_, i) => mkProduct(i));
    mockFavorites(big120);
    const large = render(<FavoritesPage />, { wrapper });
    const count120 = countMasonryCards(large.queryAllByTestId);
    // 渲染节点数由窗口参数决定，与数据总量无关（P0 红线：不随收藏量全量增长）
    expect(count120).toBe(count60);
  });

  it('对称网格行化（20261105 方案甲）：每行 = 原序相邻两张卡 [i, i+1]，行序 = 数据序', () => {
    mockFavorites(bigFavorites);
    const { getAllByTestId } = render(<FavoritesPage />, { wrapper });
    const renderedIds = getAllByTestId(/^favorites-masonry-vp\d+$/)
      .map((n) => String(n.props.testID).replace('favorites-masonry-', ''))
      .slice(0, 12);
    // 方案甲（用户拍板）：瀑布流错落改对称等高网格——不再分列（splitMasonryBalanced 已弃），
    // 行 i = favorites[2i] + favorites[2i+1]（原序相邻配对），渲染序列 = 数据原序
    const expectedPairs: string[] = [];
    for (let i = 0; i < renderedIds.length; i += 1) expectedPairs.push(bigFavorites[i].id);
    expect(renderedIds).toEqual(expectedPairs);
  });

  it('奇数项收尾行：右列缺卡不渲染空卡，不炸', () => {
    mockFavorites(oddFavorites);
    const { queryAllByTestId } = render(<FavoritesPage />, { wrapper });
    const ids = queryAllByTestId(/^favorites-masonry-vp\d+$/).map((n) =>
      String(n.props.testID).replace('favorites-masonry-', ''),
    );
    // 3 项 → 2 行（1.5 → ceil）：全量渲染（窗口 ≥ 数据量时等于全量）
    expect(new Set(ids)).toEqual(new Set(['vp000', 'vp001', 'vp002']));
  });

  it('列表态不受虚拟化改造影响：HPC 行为不变（flat Product 列表）', () => {
    mockFavorites(oddFavorites);
    const { getByTestId, getByLabelText } = render(<FavoritesPage />, { wrapper });
    fireEvent.press(getByTestId('favorites-view-list'));
    expect(getByLabelText('product.addToCartLabel:P0')).toBeTruthy();
  });
});
