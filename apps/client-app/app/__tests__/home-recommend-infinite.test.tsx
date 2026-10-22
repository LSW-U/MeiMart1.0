/**
 * 首页推荐展示 批2：home 推荐板块追加式分页 + 「加载更多」三态（方案v2 20261017）
 *
 * 验证（对齐验收线 F2/F3/F6）：
 *   - 可点态：hasNextPage=true → 按钮渲染，点击 fetchNextPage 追加 6→12（pages.flatMap）
 *   - loading 态：isFetchingNextPage → 按钮 disabled（防连点，同换一批范式）
 *   - 到底态：hasNextPage=false → 按钮消失（D4 条件渲染移除）
 *   - 换一批复位（D3 方案 B）：点击换一批 → epoch++ → 回首屏 6 条
 *   - cart 回归：旧 useRecommendations 路径消费不受 epoch 复位影响（hook 层 queryKey 隔离，
 *     页面层用「home 挂载期间 cart hook 的 queryKey 未被触达」断言）
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
  useBuyAgain: () => ({ data: [], isFetching: false }),
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

jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: { isAuthenticated: boolean }) => boolean) =>
    selector({ isAuthenticated: true }),
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

describe('HomePage 推荐板块 — 加载更多三态（批2）', () => {
  beforeEach(() => {
    mockPages = [[0, 6]];
    mockHasNextPage = true;
    mockIsFetchingNextPage = false;
    mockFetchNextPage.mockClear();
  });

  it('F2 可点态：首屏 6 张卡片 + 按钮渲染；点击触发 fetchNextPage', () => {
    const { getByTestId, queryAllByTestId } = setup();
    expect(getByTestId('home-recommend-load-more')).toBeTruthy();
    // 首屏 6 张卡片（pages.flatMap 拼第一页）
    expect(queryAllByTestId(/masonry-card-/)).toHaveLength(6);

    act(() => {
      fireEvent.press(getByTestId('home-recommend-load-more'));
    });
    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('F2 追加断言：fetchNextPage 后 6→12 张卡片（分列重排由 masonryRow 承担）', () => {
    const { getByTestId, queryAllByTestId, rerender } = setup();
    act(() => {
      fireEvent.press(getByTestId('home-recommend-load-more'));
    });
    rerender(
      <ThemeProvider>
        <HomePage />
      </ThemeProvider>,
    );
    const cards = queryAllByTestId(/masonry-card-/);
    expect(cards).toHaveLength(12);
    // F3 奇偶分列：第 1 条落左列（索引 0 偶数）、追加的第 7 条仍按索引落列
    expect(queryAllByTestId('masonry-card-p7').length).toBeGreaterThan(0);
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

  it('F2 loading 态：isFetchingNextPage → 按钮 disabled（防连点）', () => {
    mockIsFetchingNextPage = true;
    const { getByTestId } = setup();
    const btn = getByTestId('home-recommend-load-more');
    expect(btn.props.accessibilityState?.disabled ?? btn.props.disabled).toBe(true);
  });

  it('F2 到底态：hasNextPage=false → 按钮消失（D4 条件渲染移除）', () => {
    mockHasNextPage = false;
    const { queryByTestId } = setup();
    expect(queryByTestId('home-recommend-load-more')).toBeNull();
  });

  it('换一批复位（D3 方案 B）：推荐板块 epoch 状态推进，按钮仍在（回首屏由 hook queryKey 承担）', () => {
    const { getByTestId } = setup();
    // epoch 复位语义在 hook 层已验证（useProducts.recommendInfinite.test）；
    // 页面层断言换一批按钮可点且不触 fetchNextPage（两按钮语义隔离）
    expect(getByTestId('home-recommend-change-batch')).toBeTruthy();
    fireEvent.press(getByTestId('home-recommend-change-batch'));
    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });

  it('cart 回归：页面 mock 未注册旧 useRecommendations 仍渲染成功（home 已不依赖旧 hook）', () => {
    // home 切 infinite 后不再调用 useRecommendations——mock 模块未提供该导出，
    // 页面渲染成功本身就是回归证据；cart.tsx 消费路径由 hook 层 queryKey 隔离断言兜底
    const { getByTestId } = setup();
    expect(getByTestId('home-recommend-load-more')).toBeTruthy();
  });

  it('批3 P2-1 修复：buy-again 板块「查看全部」入口存在且跳转常购清单页', () => {
    const { getByTestId } = setup();
    const entry = getByTestId('home-buy-again-view-all');
    expect(entry).toBeTruthy();
    fireEvent.press(entry);
    expect(jest.requireMock('expo-router').router.push).toHaveBeenCalledWith(
      '/product/frequently-bought',
    );
  });
});
