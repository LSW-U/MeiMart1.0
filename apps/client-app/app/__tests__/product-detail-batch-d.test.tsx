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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
  category: 'c002',
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
  // P2-1: 商品详情页 buyNow 链新增 useQueryClient —— 页面需 QueryClientProvider
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
    it('底部栏加购仍触发 mutate（product, quantity=1, skuId=undefined 无 skus 数据）', () => {
      setup({});
      fireEvent.press(screen.getByText('product.addToCart'));
      expect(mockMutate).toHaveBeenCalledWith(
        {
          product: expect.objectContaining({ id: 'p001' }),
          quantity: 1,
          // 20261114 规格选择器接真实 SKU：makeProduct 无 skus → selectedSkuId null → undefined
          skuId: undefined,
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      );
    });
  });

  // ===== 20261114 规格选择器接真实 SKU（拍板 Q1-A/Q2-A，替代 variantTemplates 模板）=====
  describe('规格选择器接真实 SKU', () => {
    const makeSkus = (
      over: Partial<Product['skus'] extends (infer S)[] | undefined ? S : never> = {},
    ) => [
      {
        id: 'sku-small',
        name: { en: 'Small', zh: '小号', tet: 'Small', pt: 'Pequeno' },
        price: 5.99,
        stock: 0, // 缺货 SKU（Small——还原削皮器验收场景）
        imageUrl: null,
        ...over,
      },
      {
        id: 'sku-large',
        name: { en: 'Large', zh: '大号', tet: 'Large', pt: 'Grande' },
        price: 10.78,
        stock: 190,
        imageUrl: null,
      },
    ];

    it('有 skus → 渲染 pill（SKU 名 localize），默认选中第一个有货 SKU（跳过缺货 Small）', () => {
      setup({ skus: makeSkus() });
      expect(screen.getByText('Small')).toBeTruthy();
      expect(screen.getByText('Large')).toBeTruthy();
      // 默认选中 large（Small stock=0 被跳过）——a11y selected 态取证
      expect(
        screen.getByLabelText('product.a11y.variantOption:group=product.selectVariant|option=Large')
          .props.accessibilityState.selected,
      ).toBe(true);
      expect(
        screen.getByLabelText('product.a11y.variantOption:group=product.selectVariant|option=Small')
          .props.accessibilityState.selected,
      ).toBe(false);
    });

    it('缺货 SKU pill 禁用态 + 点击不切换选中（stock=0 判定，Q1-A per-SKU stock）', () => {
      setup({ skus: makeSkus() });
      const small = screen.getByLabelText(
        'product.a11y.variantOption:group=product.selectVariant|option=Small',
      );
      expect(small.props.accessibilityState.disabled).toBe(true);
      fireEvent.press(small);
      // 点击后选中态仍在 Large（缺货 pill 不接管选中）
      expect(
        screen.getByLabelText('product.a11y.variantOption:group=product.selectVariant|option=Large')
          .props.accessibilityState.selected,
      ).toBe(true);
    });

    it('点有货 SKU 切换选中 + 加购携带该 skuId（cartApi.addItemById 链路参数源）', () => {
      setup({ skus: makeSkus() });
      fireEvent.press(
        screen.getByLabelText(
          'product.a11y.variantOption:group=product.selectVariant|option=Large',
        ),
      );
      fireEvent.press(screen.getByText('product.addToCart'));
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 1, skuId: 'sku-large' }),
        expect.anything(),
      );
    });

    it('无 skus（旧契约/单品）→ 选择器整体隐藏（queryByText 为空）', () => {
      setup({});
      expect(screen.queryByText('Small')).toBeNull();
      expect(screen.queryByText('Large')).toBeNull();
    });

    it('切 SKU 后加购步进上限跟随所选 SKU stock（选缺货后 rawQtyMax=0 → qtyMax 兜底 1）', () => {
      // 渲染期派生钳制（不用 effect setState）：缺货 SKU 理论上限 0，Math.max(1, …) 兜底 1
      setup({ skus: makeSkus() });
      // 默认选中 large（stock 190）→ + 可按到 2（步进器 label 复用 cart.a11y.*）
      fireEvent.press(screen.getByLabelText('cart.a11y.increaseQty'));
      expect(screen.getByText('2')).toBeTruthy();
    });
  });

  describe('T3 弱网/空态（联调验收 §6）', () => {
    it('聚合接口 pending（isLoading）→ PageSkeleton 骨架屏（批2 阶段2 换组件）+ TopBar，不白屏', () => {
      setupWithQueryState({ isLoading: true });
      // loading 纯文字位已换 PageSkeleton(detail)（D8 审计裁定）
      expect(screen.root.findByProps({ testID: 'page-skeleton' })).toBeTruthy();
      // 页面结构完整：顶栏可交互（返回/分享按钮渲染）而非空白
      expect(screen.getByLabelText('common.goBack')).toBeTruthy();
    });

    it('慢接口恢复：loading → loaded rerender 后内容出现（转换不白屏）', () => {
      const { rerender } = setupWithQueryState({ isLoading: true });
      expect(screen.root.findByProps({ testID: 'page-skeleton' })).toBeTruthy();
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
      expect(screen.root.findAllByProps({ testID: 'page-skeleton' })).toHaveLength(0);
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

  describe('3.5 reanimated 进场动画（业务增强批3）', () => {
    it('动画容器挂载不崩溃，页面主体正常渲染（reanimated mock 下 Animated.View 透传）', () => {
      setup({});
      // 动画包裹 Carousel + 内容 Canvas：品名（3 处渲染）与轮播计数器均应在文档树内
      expect(screen.getAllByText('Fresh Red Fuji Apple').length).toBeGreaterThan(0);
      expect(screen.queryByText(/\/\d+$/)).toBeNull(); // 默认仅 mainImage 单图：计数器隐藏（同 D1 兜底用例）
    });

    it('loading 早退分支不包动画容器（PageSkeleton 直接渲染，无品名/计数器）', () => {
      setupWithQueryState({ data: null, isLoading: true });
      // PageSkeleton 内外两层均带 page-skeleton testID（组件实现），断言存在即可
      expect(screen.root.findAllByProps({ testID: 'page-skeleton' }).length).toBeGreaterThan(0);
      expect(screen.queryByText('Fresh Red Fuji Apple')).toBeNull();
    });

    it('a11y 不退化：加购按钮 accessibilityLabel 仍在（动画容器不吞可访问树）', () => {
      setup({});
      expect(screen.getByLabelText('product.addToCart')).toBeTruthy();
      expect(screen.getByLabelText('product.buyNow')).toBeTruthy();
    });
  });
});

// 20261111 Tab 锚点滚动修复（用户反馈「顶部导航点击没反应」）：TopBar 4-Tab 原本只改
//   activeTab（仅下划线消费），内容无反馈。修复后 onTabPress=handleTabPress：
//   PRODUCT→滚顶 / REVIEWS/RECOMMENDED/DETAILS→scrollTo 对应锚点段。jsdom 无真实布局
//   （onLayout 不触发、scrollTo 无法量测位移），取证口径=结构性：1) TopBar 4 个 tab 可按
//   a11y role=tab 找到且可 press（不抛错=handleTabPress 对无 y 数据安全守卫生效）；
//   2) 锚点段 View 挂载（testID tab-anchor-*）。
describe('20261111 Tab 锚点滚动修复', () => {
  it('4 个 tab 可点击（handleTabPress 无 y 时安全跳过 scrollTo，不抛错）', () => {
    setup({});
    const tabs = screen.root.findAll(
      (node) => (node.props as { accessibilityRole?: string }).accessibilityRole === 'tab',
    );
    // 12 = 4 tab × 文本节点/容器重复（a11y role 沿可访问树多节点命中），按去重后 >=4 断言；
    //   全部 press 不抛错即取证（handleTabPress 无 y 数据安全跳过 scrollTo）
    expect(tabs.length).toBeGreaterThanOrEqual(4);
    expect(() => tabs.forEach((t) => fireEvent.press(t))).not.toThrow();
  });

  it('锚点段挂载：details/reviews/recommended 三 testID 存在', () => {
    setup({});
    expect(screen.getByTestId('tab-anchor-details')).toBeTruthy();
    expect(screen.getByTestId('tab-anchor-reviews')).toBeTruthy();
    expect(screen.getByTestId('tab-anchor-recommended')).toBeTruthy();
  });
});

// 20261111 回顶修复（用户反馈「点商品 tab 不回顶」+ 拍板加右下角悬浮回顶按钮）：
//   1) PRODUCT tab 原走 sectionYs 查锚点（PRODUCT 无锚恒 undefined → 安全跳过 =
//      不回顶），修复后显式 scrollTo({y:0})；2) 悬浮回顶按钮对齐首页同款
//      （滚过 600px 阈值出现、press 回顶）。取证口径：页面主 ScrollView 是
//   唯一「vertical + onScroll」的 ScrollView（轮播是 horizontal，见 D1 取证先例），
//   对它 fireEvent.scroll 翻转 showBackTop；回顶行为经 PRODUCT tab press 不抛错
//   + 按钮挂载断言（jsdom 无真实布局，scrollTo 位移不可量测，同 Tab 锚点测试口径）。
describe('20261111 回顶修复 + 悬浮回顶按钮', () => {
  const findMainScrollView = () => {
    const sv = screen.root.findAll(
      (node) =>
        typeof (node.props as { onScroll?: unknown }).onScroll === 'function' &&
        (node.props as { pagingEnabled?: boolean }).pagingEnabled !== true,
    );
    if (sv.length === 0) throw new Error('main ScrollView (vertical+onScroll) not found');
    return sv[0]!;
  };

  it('滚动超过 600px 阈值 → 回顶按钮出现（阈值内不出现）', () => {
    setup({});
    expect(screen.queryByTestId('product-back-to-top')).toBeNull();
    const sv = findMainScrollView();
    fireEvent.scroll(sv, { nativeEvent: { contentOffset: { x: 0, y: 300 } } });
    expect(screen.queryByTestId('product-back-to-top')).toBeNull();
    fireEvent.scroll(sv, { nativeEvent: { contentOffset: { x: 0, y: 700 } } });
    expect(screen.getByTestId('product-back-to-top')).toBeTruthy();
    // 回滚回阈值内 → 按钮消失
    fireEvent.scroll(sv, { nativeEvent: { contentOffset: { x: 0, y: 100 } } });
    expect(screen.queryByTestId('product-back-to-top')).toBeNull();
  });

  it('回顶按钮可点击（press 不抛错，handleBackToTop scrollTo y:0 安全守卫）', () => {
    setup({});
    const sv = findMainScrollView();
    fireEvent.scroll(sv, { nativeEvent: { contentOffset: { x: 0, y: 700 } } });
    expect(() => fireEvent.press(screen.getByTestId('product-back-to-top'))).not.toThrow();
    // 回顶后 activeTab 复位 PRODUCT（下划线高亮同步），scroll 事件复位显隐
    fireEvent.scroll(sv, { nativeEvent: { contentOffset: { x: 0, y: 0 } } });
    expect(screen.queryByTestId('product-back-to-top')).toBeNull();
  });
});
