import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import SearchResultsPage from '../search/results';
/**
 * 搜索结果页 SEARCH_CLICK 埋点 — 客户画像批5 G2（方案v2 §三 批5 2026-10-18）
 *
 * 覆盖（P5-2 漏斗口径：点击侧数字只含搜索结果点击，不含 Recommended 推荐点击）：
 *   1. 搜索结果卡点击 → trackSearchClick(productId) 调用
 *   2. Recommended 推荐卡点击 → 不计 SEARCH_CLICK（漏斗对账不污染）
 */
const mockTrackSearchClick = jest.fn();
jest.mock('@/services/behavior', () => ({
  trackProductView: jest.fn(),
  trackSearchClick: (...args: unknown[]) => mockTrackSearchClick(...args),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: () => ({ q: 'coffee' }),
}));

jest.mock('@/hooks/useSafeBack', () => ({ useSafeBack: () => jest.fn() }));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/services/queries/useProducts', () => ({
  useProductSearch: () => ({
    data: {
      pages: [
        {
          items: [
            {
              id: 'sp001',
              name: { en: 'Coffee Bean', zh: '咖啡豆', tet: 'Coffee', pt: 'Café' },
              price: 12,
              image: 'img',
              category: 'c001',
            },
          ],
          hasMore: false,
          total: 1,
        },
      ],
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
  useProducts: () => ({
    data: [
      {
        id: 'rp001',
        name: { en: 'Rec Product', zh: '推荐品', tet: 'Rec', pt: 'Rec' },
        price: 8,
        image: 'img',
        category: 'c002',
      },
    ],
  }),
}));

jest.mock('@/services/queries/useCart', () => ({
  useCart: () => ({ data: null }),
  useAddToCart: () => ({ mutate: jest.fn() }),
}));

jest.mock('@/store/toastStore', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

jest.mock('@/components/business/ProductCard', () => {
  const { View } = require('react-native');
  return {
    ProductCard: ({
      product,
      onPress,
    }: {
      product: { id: string; name: { en: string } };
      onPress: (p: { id: string }) => void;
    }) => <View testID={`result-card-${product.id}`} onTouchEnd={() => onPress(product)} />,
  };
});

jest.mock('@/components/business/MasonryProductCard/MasonryProductCard', () => {
  const { View } = require('react-native');
  return {
    MasonryProductCard: ({
      product,
      onPress,
    }: {
      product: { id: string };
      onPress: (p: { id: string }) => void;
    }) => <View testID={`rec-card-${product.id}`} onTouchEnd={() => onPress(product)} />,
  };
});

jest.mock('@/components/business/BannerCarousel', () => ({ BannerCarousel: () => null }));
jest.mock('@/components/business/SearchBar', () => {
  const { View } = require('react-native');
  return { SearchBar: () => <View /> };
});
// 重依赖壳组件桩化（SafeAreaWrapper 内部依赖 safe-area 原生模块链）
jest.mock('@/components/layout/SafeAreaWrapper', () => {
  const { View } = require('react-native');
  return {
    SafeAreaWrapper: ({ children }: { children?: React.ReactNode }) => <View>{children}</View>,
  };
});
jest.mock('@/components/cultural/TaisPattern', () => ({ TaisPattern: () => null }));

describe('搜索结果页 SEARCH_CLICK 埋点（批5 G2）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('搜索结果卡点击 → trackSearchClick(productId)', () => {
    render(
      <ThemeProvider>
        <SearchResultsPage />
      </ThemeProvider>,
    );
    fireEvent(screen.getByTestId('result-card-sp001'), 'touchEnd');
    expect(mockTrackSearchClick).toHaveBeenCalledWith('sp001');
  });

  it('Recommended 推荐卡点击 → 不计 SEARCH_CLICK（漏斗口径隔离）', () => {
    render(
      <ThemeProvider>
        <SearchResultsPage />
      </ThemeProvider>,
    );
    fireEvent(screen.getByTestId('rec-card-rp001'), 'touchEnd');
    expect(mockTrackSearchClick).not.toHaveBeenCalled();
  });
});
