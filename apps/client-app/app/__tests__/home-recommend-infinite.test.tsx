/**
 * 首页推荐板块：追加式分页 + 触底自动加载（20261107 拍板，替代「加载更多」按钮）
 *
 * 验证：
 *   - 触底自动加载：ScrollView onScroll 距底 <400px → fetchNextPage 追加 6→12
 *   - 守卫：hasNextPage=false 不触发；isFetchingNextPage 中不重复触发
 *   - 到底态：hasNextPage=false 且列表 >6 条 → 「收起推荐」文字链 + 到底提示
 *   - 换一批（baseOffset 修订）：点击换一批 → baseOffset 推进，与翻页语义隔离
 *   - cart 回归：旧 useRecommendations 路径消费不受影响（hook 层 queryKey 隔离）
 */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import HomePage from '../(main)/home';

const RECOMMEND_LIMIT = 6;

// —— hook mock：可控行为（fetchNextPage 推页、hasNextPage 三态） ——
let mockPages: number[][] = [[0, 6]];
let mockHasNextPage = true;
let mockIsFetchingNextPage = false;
const mockFetchNextPage = jest.fn(() => {
  if (mockPages.length * RECOMMEND_LIMIT < 12 && mockPages.length === 1) {
    mockPages = [
      [0, 6],
      [6, 6],
    ];
  } else {
    mockHasNextPage = false; // 第 3 批短批（mock 池 15 条口径 6+6+3 → 简化 12 到底）
  }
});
jest.mock('@/services/queries/useProducts', () => ({
  useRecommendationsInfinite: () => ({
    data: {
      pages: mockPages.map(([offset, size]) =>
        Array.from({ length: size }, (_, i) => ({
          id: `p${offset + i + 1}`,
          name: {
            en: `P${offset + i + 1}`,
            zh: `商品${offset + i + 1}`,
            tet: `P${offset + i + 1}`,
            pt: `P${offset + i + 1}`,
          },
          price: 1,
          image: '',
          category: 'c001',
        })),
      ),
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    isFetching: false,
    fetchNextPage: mockFetchNextPage,
    isFetchingNextPage: mockIsFetchingNextPage,
    hasNextPage: mockHasNextPage,
  }),
  // 批3 B8：home 现调用 useFrequentBundle，缺 mock 会 undefined 崩
  useFrequentBundle: () => ({ data: undefined }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/services/queries/useNotifications', () => ({
  useUnreadCount: () => ({ data: 0 }),
}));

jest.mock('@/services/queries/useCatalog', () => ({
  useCategories: () => ({ data: [] }),
  useBanners: () => ({ data: [] }),
}));

jest.mock('@/services/queries/usePromotions', () => ({
  usePromotions: () => ({ data: [] }),
}));

jest.mock('@/services/queries/useCart', () => ({
  useAddToCart: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/hooks/useWeakNetworkUI', () => ({
  useWeakNetworkUI: () => ({ shouldSkipNonEssential: false }),
}));

jest.mock('@/store/toastStore', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

// MasonryProductCard 依赖重（图标/渐变），页面级测试桩化——只断言卡片 testID 分发
jest.mock('@/components/business/MasonryProductCard/MasonryProductCard', () => {
  const { View } = require('react-native');
  return {
    MasonryProductCard: ({ product }: { product: { id: string } }) => (
      <View testID={`masonry-card-${product.id}`} />
    ),
  };
});
jest.mock('@/components/business/SmallProductCard/SmallProductCard', () => {
  const { View } = require('react-native');
  return { SmallProductCard: ({ product }: { product: { id: string } }) => <View /> };
});
jest.mock('@/components/business/BannerCarousel', () => ({ BannerCarousel: () => null }));
jest.mock('@/components/business/CategoryGrid', () => ({ CategoryGrid: () => null }));
jest.mock('@/components/business/PromoDock', () => ({ PromoDock: () => null }));

const setup = () =>
  render(
    <ThemeProvider>
      <HomePage />
    </ThemeProvider>,
  );

// 构造 onScroll nativeEvent：距底 distance px（contentSize - viewport - offset）
const scrollNearBottom = (distance: number) => ({
  nativeEvent: {
    contentSize: { height: 2000, width: 400 },
    layoutMeasurement: { height: 800, width: 400 },
    contentOffset: { x: 0, y: 2000 - 800 - distance },
    contentInset: { top: 0, bottom: 0, left: 0, right: 0 },
  },
});

describe('HomePage 推荐板块 — 触底自动加载（20261107 拍板）', () => {
  beforeEach(() => {
    mockPages = [[0, 6]];
    mockHasNextPage = true;
    mockIsFetchingNextPage = false;
    mockFetchNextPage.mockClear();
  });

  it('触底触发：距底 <400px → fetchNextPage；追加后 6→12 张卡片', () => {
    const { getByTestId, queryAllByTestId, rerender } = setup();
    expect(queryAllByTestId(/masonry-card-/)).toHaveLength(6);

    act(() => {
      fireEvent.scroll(getByTestId('home-recommend-scroll'), scrollNearBottom(100));
    });
    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
    rerender(
      <ThemeProvider>
        <HomePage />
      </ThemeProvider>,
    );
    expect(queryAllByTestId(/masonry-card-/)).toHaveLength(12);
  });

  it('未触底不触发：距底 ≥400px → 不调 fetchNextPage', () => {
    const { getByTestId } = setup();
    act(() => {
      fireEvent.scroll(getByTestId('home-recommend-scroll'), scrollNearBottom(500));
    });
    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });

  it('守卫：hasNextPage=false → 触底也不调 fetchNextPage', () => {
    mockHasNextPage = false;
    const { getByTestId } = setup();
    act(() => {
      fireEvent.scroll(getByTestId('home-recommend-scroll'), scrollNearBottom(100));
    });
    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });

  it('守卫：isFetchingNextPage=true → 触底不重复触发（防连点）', () => {
    mockIsFetchingNextPage = true;
    const { getByTestId } = setup();
    act(() => {
      fireEvent.scroll(getByTestId('home-recommend-scroll'), scrollNearBottom(100));
    });
    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });

  // Why: 后端 offset 分页排序不稳定时跨页重复商品（20261023 real 模式 duplicate key 实证），
  //   页面层按 id 去重——重复 id 只渲染首次出现，总卡数不涨、无 duplicate key
  it('跨页重复商品去重：第二页含第一页 id 时只渲染一次', () => {
    mockPages = [
      [0, 6],
      [0, 6], // 模拟后端第 2 页重复返回第 1 页的 6 条（id 同 p1-p6）
    ];
    mockHasNextPage = false;
    const { queryAllByTestId } = setup();
    // 拼接后 12 项但有 6 个重复 id → 只渲染 6 张卡
    expect(queryAllByTestId(/masonry-card-/)).toHaveLength(6);
  });

  it('20261024 方案②：到底态且列表 >6 条 → 「收起推荐」文字链出现', () => {
    mockHasNextPage = false;
    mockPages = [
      [0, 6],
      [6, 6],
    ]; // 12 条 > 6
    const { queryByTestId, getByText } = setup();
    expect(queryByTestId('home-recommend-collapse')).toBeTruthy();
    // 到底提示语同行渲染（左中右布局：提示居中、收起贴右）
    expect(getByText('home.listEnd')).toBeTruthy();
  });

  it('20261024 方案②：到底态但列表 ≤6 条 → 收起按钮不渲染（初态无按钮）', () => {
    mockHasNextPage = false;
    mockPages = [[0, 6]]; // 6 条 = RECOMMEND_LIMIT，不出现
    const { queryByTestId } = setup();
    expect(queryByTestId('home-recommend-collapse')).toBeNull();
  });

  it('换一批（20261023 baseOffset 修订）：按钮可点且不触 fetchNextPage（两按钮语义隔离）', () => {
    const { getByTestId } = setup();
    // baseOffset 推进语义在 hook 层已验证（useProducts.recommendInfinite.test）；
    // 页面层断言换一批按钮可点且不触 fetchNextPage（两按钮语义隔离）
    expect(getByTestId('home-recommend-change-batch')).toBeTruthy();
    fireEvent.press(getByTestId('home-recommend-change-batch'));
    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });

  it('cart 回归：页面 mock 未注册旧 useRecommendations 仍渲染成功（home 已不依赖旧 hook）', () => {
    // home 切 infinite 后不再调用 useRecommendations——mock 模块未提供该导出，
    // 页面渲染成功本身就是回归证据；cart.tsx 消费路径由 hook 层 queryKey 隔离断言兜底
    const { getByTestId } = setup();
    expect(getByTestId('home-recommend-scroll')).toBeTruthy();
  });
});
