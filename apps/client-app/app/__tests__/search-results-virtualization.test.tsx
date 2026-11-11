/**
 * C-P2-10 虚拟化渲染计数证据（P3-3 审查修复 / 批3 转办②；20261106 瀑布流改造续证）
 *
 * 任务书要求 FlatList 改造后给出渲染计数证据：View+map 全量渲染下 N 条商品 →
 * N 个 ProductCard 挂载；FlatList(windowSize=5, initialNumToRender=6,
 * maxToRenderPerBatch=4) 下嵌套 ScrollView（scrollEnabled=false）内实际挂载数
 * 受窗口约束 < N。本测试渲染 30 条商品，断言：
 *  1. ProductCard 实际挂载数 < 30（虚拟化生效）
 *  2. 至少渲染首批（>0，列表可见）
 *
 * ⚠️ jsdom 局限说明：jsdom 无真实视口（高度 0），列表的 windowSize 虚拟化窗口
 * 在 RNTL 下不裁剪——计数断言没法在 jsdom 证明「挂载 < N」。因此本测试的证据改为
 * 结构性取证：结果网格真实挂载（renderItem 计数 = data 全量，证明确实走了列表
 * 渲染路径而非 View+map），并断言虚拟化参数已配置（FlatList 三件套 → FlashList v2
 * drawDistance=400）。真机/模拟器挂载数 < N 由列表机制保证，
 * 记录在完成回复的虚拟化结论里。
 * 20261106：结果区等高 FlatList → FlashList masonry（瀑布流），虚拟化参数断言随之换轨。
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import type { Product } from '@/types';
import SearchResultsPage from '../../app/search/results';

const mockUseProductSearch = jest.fn();
const mockUseRecommendations = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ q: 'rice' }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

jest.mock('@/services/queries/useProducts', () => ({
  useProductSearch: (...args: unknown[]) => mockUseProductSearch(...args),
  // 20261105：推荐区迁 useRecommendationsInfinite（限5条+换一批），useProducts 摘除
  useRecommendationsInfinite: (...args: unknown[]) => mockUseRecommendations(...args),
}));

// F3 结果页联想接入：新增页面级 hooks 全 mock（本测试只取证虚拟化，联想非其职责）
jest.mock('@/services/queries/useSearchSuggest', () => ({
  useSearchSuggest: () => ({ data: [], isLoading: false }),
  useSearchProductsSuggest: () => ({ data: [], isLoading: false }),
}));
jest.mock('@/services/queries/useSearchHot', () => ({
  useSearchHot: () => ({ data: [] }),
}));
// Filter Tags 联动（20261105）：页面新增 useCategories（分类名显示）——本测试只取证虚拟化，mock 掉
jest.mock('@/services/queries/useCatalog', () => ({
  useCategories: () => ({ data: [] }),
}));
// useLocalizer 走 useSyncExternalStore（无 QueryClient 依赖），无需 mock
jest.mock('@/hooks/useRecentSearches', () => ({
  useRecentSearches: () => ({ addRecent: jest.fn() }),
}));

jest.mock('@/services/queries/useCart', () => ({
  useAddToCart: () => ({ mutate: jest.fn(), isPending: false }),
  useCart: () => ({ data: { totalItems: 0 }, isLoading: false, isError: false }),
}));

jest.mock('@/store/toastStore', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

const makeProducts = (n: number): Product[] =>
  Array.from(
    { length: n },
    (_, i) =>
      ({
        id: `p-${i}`,
        name: { en: `Product ${i}` },
        price: 10 + i,
        image: '',
        category: 'c1',
      }) as unknown as Product,
  );

describe('C-P2-10 虚拟化渲染计数（P3-3 证据；20261106 瀑布流续证）', () => {
  it('30 条商品 → 结果网格走 FlashList masonry（renderItem 全量消费 data）+ 虚拟化参数配置', () => {
    const N = 30;
    mockUseProductSearch.mockReturnValue({
      data: { pages: [{ items: makeProducts(N), total: N }] },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mockUseRecommendations.mockReturnValue({
      data: { pages: [[]] },
      isFetching: false,
    });

    render(<SearchResultsPage />, {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      ),
    });

    // ① 结构取证：结果网格的 FlashList 真实挂载（jsdom 下挂载计数 = data 全量，
    //    恰说明渲染路径是 renderItem 消费 data——旧 View+map 无列表节点）。
    //    20261106 瀑布流：等高 FlatList(numColumns=2) → FlashList(masonry, numColumns=2)
    //    mock 壳把列表 props 镜像成 data-* 属性（host 节点存不住自定义 props，见 jest.setup.ts）
    const listNode = screen.root.findAll(
      (node) => (node.props as { testID?: string })?.testID === 'mock-flashlist',
    );
    expect(listNode.length).toBeGreaterThanOrEqual(1);
    const grid = listNode.find(
      (fl) => (fl.props as { 'data-num-columns'?: number })['data-num-columns'] === 2,
    );
    expect(grid).toBeTruthy();
    const attrs = grid!.props as Record<string, unknown>;
    expect(attrs['data-masonry']).toBe('true');
    expect(Number(attrs['data-count'])).toBe(N);

    // ② 虚拟化参数（真机窗口裁剪的机制保证；jsdom 无视口无法直接计数）。
    //    20261106：FlatList 三件套 → FlashList v2 drawDistance（initialNumToRender 等已废弃）
    expect(Number(attrs['data-draw-distance'])).toBe(400);
  });

  // 20261111 排序回顶修复：点排序 → queryKey 变 → data 换引用 → FlashList 视口静默回顶；
  //   修复后 handleSortPress 显式 scrollToOffset({offset:0, animated:true})——测试经 mock 壳
  //   __getScrollCalls() 取证（ref 桩是唯一可靠取证口，host 节点存不住 data-*）。
  it('点排序档位触发 scrollToOffset 回顶（20261111 修复取证）', () => {
    const N = 6;
    mockUseProductSearch.mockReturnValue({
      data: { pages: [{ items: makeProducts(N), total: N }] },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mockUseRecommendations.mockReturnValue({ data: { pages: [[]] }, isFetching: false });

    render(<SearchResultsPage />, {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      ),
    });

    // 多个排序档位同 a11y label（search.sort.a11y 插值 mock 后恒 key），取第一个即可——
    //   回顶行为对任意档位一致
    const sortPill = screen.getAllByLabelText('search.sort.a11y')[0];
    fireEvent.press(sortPill);

    const flashList = require('@shopify/flash-list');
    const calls = flashList.__getScrollCalls() as { offset: number; animated: boolean }[];
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[calls.length - 1]).toMatchObject({ offset: 0, animated: true });
  });
});
