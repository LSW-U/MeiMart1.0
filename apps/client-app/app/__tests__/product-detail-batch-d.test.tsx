/**
 * ProductDetailPage 批D（商品详情整合）页面测试
 *
 * 覆盖验收线：
 * - D1 真实多图轮播：images[] 消费（mainImage 首图去重前置）+ 空数组兜底单图 + 计数器真实分母
 * - D2 真实销量+评分：stockRow 已售 N（formatCompactNumber）+ 评论汇总卡 avg/count
 * - D3 热销徽章：isCategoryTop3 驱动（替换原无条件硬编码 badgeBestSeller）
 * - D4 库存紧张阈值 ≤5：边界 5/6 + 售罄 banner
 * - D5 就近仓可用性三态（P2-2）：有货（仓名插值）/ 仓售罄 / 无货 / 无数据隐藏
 * - D6 加购回归：底部栏加购仍触发 mutate（product, quantity）
 * - P3-1 头部评分位（rating 消费）/ P3-2 轮播索引换品重置
 *
 * 放 app/__tests__（非 app/product 括号路由目录）：同 order-detail-banner.test 注释。
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { ThemeProvider } from '@/theme';
import ProductDetailPage from '../product/[id]';
import type { Product, WarehouseAvailability } from '@/types';
import type { ReviewSummary } from '@/services/reviews';

const mockUseProduct = jest.fn();
const mockUseProducts = jest.fn();
const mockUseWarehouse = jest.fn();
const mockUseReviews = jest.fn();
const mockMutate = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: 'p001' }),
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  // t 返回 key + 插值变量（k=v 拼接），断言对拼接结果
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && Object.keys(opts).length > 0
        ? `${key}:${Object.entries(opts)
            .map(([k, v]) => `${k}=${v}`)
            .join('|')}`
        : key,
    i18n: { language: 'en' },
  }),
}));

jest.mock('@/i18n', () => ({
  useLocalizer: () => (text?: { en?: string }) => text?.en ?? '',
}));

jest.mock('@/services/api', () => ({
  isMockMode: false,
}));

jest.mock('expo-blur', () => ({
  BlurView: (props: { children?: React.ReactNode }) => props.children ?? null,
}));

jest.mock('@/services/queries/useProducts', () => ({
  useProduct: (...args: unknown[]) => mockUseProduct(...args),
  useProducts: (...args: unknown[]) => mockUseProducts(...args),
  useWarehouseAvailability: (...args: unknown[]) => mockUseWarehouse(...args),
}));

jest.mock('@/services/queries/useCart', () => ({
  useCart: () => ({ data: null }),
  useAddToCart: () => ({ mutate: mockMutate }),
}));

jest.mock('@/services/queries/useFavorites', () => ({
  useFavorites: () => ({ data: [] }),
  useToggleFavorite: () => ({ mutate: jest.fn() }),
}));

jest.mock('@/services/queries/useAddress', () => ({
  useAddresses: () => ({
    data: [
      {
        id: 'a001',
        name: '张三',
        phone: '13800138000',
        province: '',
        city: 'Dili',
        district: '',
        detail: 'Rua Formosa 12',
        isDefault: true,
        lat: -8.5569,
        lng: 125.5603,
      },
    ],
  }),
}));

jest.mock('@/services/queries/useReviews', () => ({
  useReviews: (...args: unknown[]) => mockUseReviews(...args),
  consumeLastSubmittedReviewId: () => null,
}));

const makeProduct = (over: Partial<Product> = {}): Product => ({
  id: 'p001',
  name: {
    en: 'Fresh Red Fuji Apple',
    zh: '新鲜红富士苹果',
    tet: 'Maçã Fuji Vermelha Frescu',
    pt: 'Maçã Fuji Vermelha Fresca',
  },
  price: 25.9,
  image: 'https://cdn.example.com/main.jpg',
  category: 'fruits',
  salesCount: 1280,
  stock: 85,
  rating: 4.8,
  description: {
    en: 'Crisp and sweet',
    zh: '脆甜多汁',
    tet: 'Rdi ho midar',
    pt: 'Crocante e doce',
  },
  ...over,
});

const emptySummary: ReviewSummary = {
  avg: 0,
  count: 0,
  distribution: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0, percent: 0 })),
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const setup = (
  productOver: Partial<Product> = {},
  opts: { warehouse?: WarehouseAvailability | null; reviews?: ReviewSummary } = {},
) => {
  mockUseProduct.mockReturnValue({
    data: makeProduct(productOver),
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
  mockUseProducts.mockReturnValue({ data: [] });
  mockUseWarehouse.mockReturnValue({ data: opts.warehouse ?? null });
  mockUseReviews.mockReturnValue({
    data: { reviews: [], summary: opts.reviews ?? emptySummary },
    isLoading: false,
  });
  return render(<ProductDetailPage />, { wrapper });
};

// T3 弱网/空态：直接控制 useProduct 查询态（loading / error / data null），验证降级 UI 不白屏
const setupWithQueryState = (
  queryState: { data?: Product | null; isLoading?: boolean; isError?: boolean },
  opts: { reviewsLoading?: boolean } = {},
) => {
  mockUseProduct.mockReturnValue({
    data: queryState.data ?? null,
    isLoading: queryState.isLoading ?? false,
    isError: queryState.isError ?? false,
    refetch: jest.fn(),
  });
  mockUseProducts.mockReturnValue({ data: [] });
  mockUseWarehouse.mockReturnValue({ data: null });
  mockUseReviews.mockReturnValue({
    data: { reviews: [], summary: emptySummary },
    isLoading: opts.reviewsLoading ?? false,
  });
  return render(<ProductDetailPage />, { wrapper });
};

describe('批D 商品详情整合', () => {
  describe('D1 真实多图轮播', () => {
    it('images[] 3 张（mainImage 首图）→ 计数器 1/3（替换假三图 /3 硬编码）', () => {
      setup({
        images: [
          'https://cdn.example.com/main.jpg',
          'https://cdn.example.com/b.jpg',
          'https://cdn.example.com/c.jpg',
        ],
      });
      expect(screen.getByText('1/3')).toBeTruthy();
    });

    it('mainImage 不在 images[] 中 → 前置补齐且去重（main+b+c = 3 张）', () => {
      setup({ images: ['https://cdn.example.com/b.jpg', 'https://cdn.example.com/c.jpg'] });
      expect(screen.getByText('1/3')).toBeTruthy();
    });

    it('mainImage 在 images[] 中 → 去重不重复（main+b = 2 张，非 3）', () => {
      setup({ images: ['https://cdn.example.com/main.jpg', 'https://cdn.example.com/b.jpg'] });
      expect(screen.getByText('1/2')).toBeTruthy();
    });

    it('无 images → 兜底 mainImage 单图，计数器/分页点隐藏（避免 1/1 噪音）', () => {
      setup({});
      expect(screen.queryByText('1/1')).toBeNull();
    });
  });

  describe('D2 真实销量 + 评分', () => {
    it('salesCount 有值 → 已售 N（compact 格式），无值不渲染', () => {
      setup({ salesCount: 1200 });
      expect(screen.getByText('1.2K product.sold')).toBeTruthy();
    });

    it('评论汇总卡消费真实 avg/count（rating 展示位，原型唯一评分区）', () => {
      setup(
        {},
        {
          reviews: {
            avg: 4.5,
            count: 2,
            distribution: [5, 4, 3, 2, 1].map((stars) => ({
              stars,
              count: stars === 5 ? 2 : 0,
              percent: stars === 5 ? 100 : 0,
            })),
          },
        },
      );
      expect(screen.getByText('4.5')).toBeTruthy();
      expect(screen.getByText('2 product.reviews')).toBeTruthy();
    });
  });

  describe('D3 热销徽章 isCategoryTop3 驱动', () => {
    it('isCategoryTop3=true → 徽章渲染', () => {
      setup({ isCategoryTop3: true });
      expect(screen.getByText('product.badgeBestSeller')).toBeTruthy();
    });

    it('isCategoryTop3 缺失 → 不渲染（替换原无条件硬编码，宁缺毋假）', () => {
      setup({});
      expect(screen.queryByText('product.badgeBestSeller')).toBeNull();
    });
  });

  describe('D4 库存紧张阈值 ≤5', () => {
    it('stock 3 → 仅剩提示 + 步进上限联动', () => {
      setup({ stock: 3 });
      expect(screen.getByText('product.onlyLeft:count=3')).toBeTruthy();
    });

    it('边界：stock 5 紧张 / stock 6 充足', () => {
      const first = setup({ stock: 5 });
      expect(screen.getByText('product.onlyLeft:count=5')).toBeTruthy();
      first.unmount();
      setup({ stock: 6 });
      expect(screen.queryByText(/product\.onlyLeft/)).toBeNull();
    });

    it('stock 0 → 售罄 banner，库存行/仅剩提示隐藏', () => {
      setup({ stock: 0 });
      expect(screen.getByText('product.soldOut')).toBeTruthy();
      expect(screen.queryByText(/product\.onlyLeft/)).toBeNull();
    });
  });

  describe('P3-1 头部评分位', () => {
    it('rating 有值 → 价格行内联 star+分数（样式对齐 ProductCard metaRow）', () => {
      setup({});
      expect(screen.getByText('4.8')).toBeTruthy();
    });

    it('rating 缺失 → 评分位不渲染', () => {
      setup({ rating: undefined });
      expect(screen.queryByText('4.8')).toBeNull();
    });
  });

  describe('P3-2 轮播索引换品重置', () => {
    it('同实例换品 → activeImage 重置（计数器回 1/N，不残留 3/3）', () => {
      const WIDTH = Dimensions.get('window').width;
      // main 首图（mainImage 在 images 中）→ 共 3 张；若用不含 main 的三张会是 4 张（main 前置）
      const images3 = [
        'https://cdn.example.com/main.jpg',
        'https://cdn.example.com/b.jpg',
        'https://cdn.example.com/c.jpg',
      ];
      const { rerender } = setup({ images: images3 });
      // 滑到第 3 张（轮播 = 唯一 horizontal + onScroll 的 ScrollView；jest-expo mock 会给
      // 其他 ScrollView 注入 pagingEnabled 默认值，不能按 pagingEnabled 定位）
      const carousel = screen.root
        .findAllByProps({ horizontal: true })
        .find((n) => typeof n.props.onScroll === 'function');
      expect(carousel).toBeTruthy();
      if (!carousel) throw new Error('carousel ScrollView not found');
      fireEvent.scroll(carousel, {
        nativeEvent: { contentOffset: { x: WIDTH * 2 + 10 } },
      });
      expect(screen.getByText('3/3')).toBeTruthy();
      // 同实例换品（非 remount 路径）→ 重置回 1/3
      mockUseProduct.mockReturnValue({
        data: makeProduct({ id: 'p002', images: images3 }),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      rerender(
        <ThemeProvider>
          <ProductDetailPage />
        </ThemeProvider>,
      );
      expect(screen.getByText('1/3')).toBeTruthy();
    });
  });

  describe('D5 就近仓可用性三态（P2-2）', () => {
    it('有货：绿字 + 仓名插值（@Public 仅 name + 有货态）', () => {
      setup(
        {},
        {
          warehouse: {
            matchedWarehouseId: 'w-1',
            warehouseName: 'Dili Central Warehouse',
            quantity: 85,
            available: true,
          },
        },
      );
      expect(screen.getByText('product.warehouseInStock:name=Dili Central Warehouse')).toBeTruthy();
    });

    it('仓售罄：匹配到仓（matched 非空）但 quantity=0 → 售罄文案（P3-4 由「无货」更名）', () => {
      setup(
        {},
        {
          warehouse: {
            matchedWarehouseId: 'w-1',
            warehouseName: 'Dili Central Warehouse',
            quantity: 0,
            available: false,
          },
        },
      );
      expect(screen.getByText('product.warehouseSoldOut:name=Dili Central Warehouse')).toBeTruthy();
      expect(screen.queryByText(/product\.warehouseNoStock/)).toBeNull();
    });

    it('无货：matchedWarehouseId=null（无匹配仓）→ 无货文案', () => {
      setup(
        {},
        {
          warehouse: {
            matchedWarehouseId: null,
            warehouseName: null,
            quantity: 0,
            available: false,
          },
        },
      );
      expect(screen.getByText('product.warehouseNoStock')).toBeTruthy();
      expect(screen.queryByText(/product\.warehouseInStock/)).toBeNull();
    });

    it('防御分支：available=true 但仓名缺失 → 通用无货文案（修复语义反转，契约下不可达）', () => {
      setup(
        {},
        {
          warehouse: {
            matchedWarehouseId: 'w-1',
            warehouseName: null,
            quantity: 85,
            available: true,
          },
        },
      );
      expect(screen.getByText('product.warehouseNoStock')).toBeTruthy();
      expect(screen.queryByText(/product\.warehouseInStock/)).toBeNull();
      expect(screen.queryByText(/product\.warehouseSoldOut/)).toBeNull();
    });

    it('无数据（端点未部署门禁/无坐标/失败）→ 整块隐藏不阻塞', () => {
      setup({});
      expect(screen.queryByText(/product\.warehouseInStock/)).toBeNull();
      expect(screen.queryByText(/product\.warehouseNoStock/)).toBeNull();
      expect(screen.queryByText(/product\.warehouseSoldOut/)).toBeNull();
    });
  });

  describe('D6 加购回归', () => {
    it('底部栏加购仍触发 mutate（product, quantity=1 起步）', () => {
      setup({});
      fireEvent.press(screen.getByText('product.addToCart'));
      expect(mockMutate).toHaveBeenCalledWith(
        { product: expect.objectContaining({ id: 'p001' }), quantity: 1 },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      );
    });
  });

  describe('T3 弱网/空态（联调验收 §6）', () => {
    it('聚合接口 pending（isLoading）→ loading 占位 + TopBar，不白屏', () => {
      setupWithQueryState({ isLoading: true });
      expect(screen.getByText('common.loading')).toBeTruthy();
      // 页面结构完整：顶栏可交互（返回/分享按钮渲染）而非空白
      expect(screen.getByLabelText('common.goBack')).toBeTruthy();
    });

    it('慢接口恢复：loading → loaded rerender 后内容出现（转换不白屏）', () => {
      const { rerender } = setupWithQueryState({ isLoading: true });
      expect(screen.getByText('common.loading')).toBeTruthy();
      mockUseProduct.mockReturnValue({
        data: makeProduct(),
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      rerender(
        <ThemeProvider>
          <ProductDetailPage />
        </ThemeProvider>,
      );
      // 品名在页面出现 3 处（分享/标题/评论区），用 getAllByText 断言至少渲染一处
      expect(screen.getAllByText('Fresh Red Fuji Apple').length).toBeGreaterThan(0);
      expect(screen.queryByText('common.loading')).toBeNull();
    });

    it('接口失败/超时（isError）→ ErrorState 降级（product.notFound + 可重试），不白屏', () => {
      setupWithQueryState({ isError: true });
      expect(screen.getByText('product.notFound')).toBeTruthy();
    });

    it('data null 且非 loading（!product）→ 同走 ErrorState 降级', () => {
      setupWithQueryState({ data: null, isLoading: false });
      expect(screen.getByText('product.notFound')).toBeTruthy();
    });

    it('评论接口慢（reviewsLoading）→ 评分区骨架占位（— + 淡化），不白屏', () => {
      setupWithQueryState({ data: makeProduct() }, { reviewsLoading: true });
      expect(screen.getByText('—')).toBeTruthy();
    });

    it('无销量（salesCount 缺失）→ 销量位不渲染，页面不崩', () => {
      setup({ salesCount: undefined });
      expect(screen.queryByText(/product\.sold/)).toBeNull();
      expect(screen.getAllByText('Fresh Red Fuji Apple').length).toBeGreaterThan(0);
    });

    it('销量 0（合法值）→ 显示 0 Sold（真实数据，不崩）', () => {
      setup({ salesCount: 0 });
      expect(screen.getByText('0 product.sold')).toBeTruthy();
    });

    it('全空图片（mainImage 空 + images 空）→ 轮播容器兜底灰底，无计数器/分页点，页面主体仍渲染', () => {
      setup({ image: '', images: [] });
      expect(screen.queryByText(/\/\d+$/)).toBeNull(); // 无 N/M 计数器
      expect(screen.getAllByText('Fresh Red Fuji Apple').length).toBeGreaterThan(0); // 主体不白屏
    });
  });
});
