import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '@/theme';
import * as favoritesQueries from '@/services/queries/useFavorites';
import { useAuthStore } from '@/store/authStore';
import FavoritesPage from '../favorites';
import type { Product } from '@/types';

// P19 页面测试：mock 依赖（RQ hooks / authStore 已是 zustand 可直接 set）
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number; name?: string; defaultValue?: string }) => {
      if (opts?.name !== undefined) return `${key}:${opts.name}`;
      if (opts?.count !== undefined) return `${key}:${opts.count}`;
      return key;
    },
  }),
}));

jest.mock('@/services/queries/useFavorites', () => ({
  useFavorites: jest.fn(),
  useRemoveFavorites: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

jest.mock('@/services/queries/useCart', () => ({
  useAddToCart: () => ({ mutate: jest.fn() }),
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

const products: Product[] = [
  {
    id: 'p1',
    name: { zh: '苹果', en: 'Apple', tet: 'Apple' },
    price: 3.5,
    image: 'https://example.com/a.jpg',
    category: 'fruit',
    salesCount: 120,
    rating: 4.5,
  },
  {
    id: 'p2',
    name: { zh: '牛奶', en: 'Milk', tet: 'Milk' },
    price: 2.8,
    image: 'https://example.com/m.jpg',
    category: 'dairy',
    salesCount: 98,
  },
];

const mockFavorites = (data: Product[] | undefined, loading = false, error = false) => {
  (favoritesQueries.useFavorites as unknown as jest.Mock).mockReturnValue({
    data,
    isLoading: loading,
    isError: error,
    refetch: jest.fn(),
  });
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('FavoritesPage（P19：视图切换 + 登录空态 + 无排序）', () => {
  beforeEach(() => {
    AsyncStorage.clear();
    useAuthStore.setState({ isAuthenticated: true });
    jest.clearAllMocks();
    mockFavorites(products);
  });

  it('默认网格视图（MasonryProductCard 两列瀑布流），可切列表（HorizontalProductCard）', async () => {
    const { getByTestId, getByLabelText } = render(<FavoritesPage />, { wrapper });
    // 默认网格：网格按钮 selected + 瀑布流卡片渲染（奇偶分列，p1 在列 1）
    expect(getByTestId('favorites-view-grid').props.accessibilityState?.selected).toBe(true);
    expect(getByTestId('favorites-masonry-p1')).toBeTruthy();
    expect(getByTestId('favorites-masonry-p2')).toBeTruthy();
    // 瀑布流常态 a11y：卡片点按 label View {{name}}
    expect(getByLabelText('product.viewItem:Apple')).toBeTruthy();
    // 切列表
    fireEvent.press(getByTestId('favorites-view-list'));
    expect(getByTestId('favorites-view-list').props.accessibilityState?.selected).toBe(true);
    expect(getByTestId('favorites-view-grid').props.accessibilityState?.selected).toBeUndefined();
    // 列表态渲染 HPC 加购按钮（a11y label 来自 mock）
    expect(getByLabelText('product.addToCartLabel:Apple')).toBeTruthy();
    // 偏好持久化
    await waitFor(() => {
      expect(AsyncStorage.getItem('meimart.favorites.view')).resolves.toBe('list');
    });
  });

  it('未登录空态显示登录引导（非去逛逛）', () => {
    useAuthStore.setState({ isAuthenticated: false });
    mockFavorites(undefined);
    const { getByText, queryByText } = render(<FavoritesPage />, { wrapper });
    expect(getByText('favorites.loginTitle')).toBeTruthy();
    expect(queryByText('favorites.goBrowse')).toBeNull();
  });

  it('已登录空收藏显示去逛逛引导', () => {
    mockFavorites([]);
    const { getByText, queryByText } = render(<FavoritesPage />, { wrapper });
    expect(getByText('favorites.empty')).toBeTruthy();
    expect(queryByText('favorites.loginTitle')).toBeNull();
  });

  it('持久化偏好为 list 时恢复列表视图', async () => {
    await AsyncStorage.setItem('meimart.favorites.view', 'list');
    const { getByTestId } = render(<FavoritesPage />, { wrapper });
    await waitFor(() => {
      expect(getByTestId('favorites-view-list').props.accessibilityState?.selected).toBe(true);
    });
  });

  it('工具栏无排序入口（D3：不实现排序）', () => {
    const { queryByLabelText } = render(<FavoritesPage />, { wrapper });
    expect(queryByLabelText(/sort/i)).toBeNull();
  });

  it('管理态勾选刷新（审查 Q1 extraData 回归）：点卡后删除按钮计数 +1', () => {
    const { getByTestId, getByLabelText, getByText } = render(<FavoritesPage />, { wrapper });
    fireEvent.press(getByTestId('favorites-manage'));
    // 管理态卡点击：外层 Pressable（a11y label "name, 管理收藏"）→ toggleSelect
    // （ProductCard interactive=false 降级 View，Web 端内层 Pressable 吞点击的修复）
    fireEvent.press(getByLabelText('Apple, favorites.a11y.manage'));
    // extraData 修复前 FlatList cell 不重渲染，但 manageBar 删除按钮计数走 header 层
    // （selected 状态页级）——按钮文案 (1) 即勾选生效
    expect(getByText('common.delete (1)')).toBeTruthy();
    // 取消勾选 → 计数归 0
    fireEvent.press(getByLabelText('Apple, favorites.a11y.manage'));
    expect(getByText('common.delete (0)')).toBeTruthy();
  });
});
