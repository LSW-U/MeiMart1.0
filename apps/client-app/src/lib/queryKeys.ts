/**
 * 集中 queryKey factory（数据层工程治理 批1 D1/D15，方案v2 20261029）
 *
 * 唯一出口：全仓所有 react-query queryKey 只允许经本文件生成（V1-3 归零口径）。
 * 规范见 docs/query-key-conventions.md；并行工单 key 归属见 docs/query-key-parallel-ledger.md。
 *
 * 依赖纪律（R3 防循环依赖）：本文件对业务代码只允许 `import type`。
 * 例外：CATALOG_TTL（@/services/offline/catalogPolicy）——该模块零 import，无环风险；
 * 批2 缓存分级落 factory 时再吸收其职责。
 *
 * 段序规范：[domain, ...scope, ...params]——第一段是域根（前缀失效锚点），
 * 中段是子域/形态（detail/infinite/counts…），尾段是业务参数。不得在域根前插段。
 */

import type { OrderStatus } from '@/types';
import type { OrderTabKey } from '@/lib/orderStatusConfig';
import { CATALOG_TTL } from '@/services/offline/catalogPolicy';

// ============================================================================
// staleTime 伴随导出（D15）：key 与缓存分级单一真源，hook 内消费，不另立分级文件。
// 值 = 各 hook 现行 staleTime（批1 原值迁移，不改任何查询语义）。
// ============================================================================
export const STALE_TIME = {
  // 目录类（沿用 CATALOG_TTL 分层，断网冷启动目录可浏览）
  categories: CATALOG_TTL.categories,
  banners: CATALOG_TTL.banners,
  productList: CATALOG_TTL.productList,
  productDetail: CATALOG_TTL.productDetail,
  // 推荐/营销（价格敏感，5min 短档；catalogPolicy.ts 刻意不接线注释同源）
  recommend: 5 * 60 * 1000,
  buyAgain: 5 * 60 * 1000,
  frequentBundle: 5 * 60 * 1000,
  // 搜索联想/热搜
  search: 60 * 1000,
  searchHot: 5 * 60 * 1000,
  suggest: 60 * 1000,
  // 商品域杂项
  warehouseAvailability: 60 * 1000,
  // 购物车/结算
  cart: 60 * 1000,
  checkoutPreview: 30 * 1000,
  // 优惠券
  coupons: 60 * 1000,
  couponValidate: 30 * 1000,
  availableCoupons: 30 * 1000,
  // 活动入口
  promotions: 10 * 60 * 1000,
  // 订单
  orders: 60 * 1000,
  orderEta: 60 * 1000,
  // 评论
  reviews: 60 * 1000,
  orderReviews: 30 * 1000,
  // 售后
  refunds: 60 * 1000,
  refundDetail: 30_000,
  // 工单（替换品批2 工单化 2026-10-29）
  tickets: 60 * 1000,
  ticketDetail: 30_000,
  // 用户/地址/支付
  profile: 5 * 60 * 1000,
  addresses: 5 * 60 * 1000,
  payments: 5 * 60 * 1000,
  favorites: 60 * 1000,
  // 通知（原 30s 沿用；偏好 60s）
  notifications: 30 * 1000,
  notificationPrefs: 60 * 1000,
  // 订阅提醒
  subscriptions: 60 * 1000,
  // 引导页
  onboardingSlides: 60 * 60 * 1000,
} as const;

// ============================================================================
// catalog 目录
// ============================================================================
export const CATEGORIES_QUERY_KEY = ['categories'] as const;
export const BANNERS_QUERY_KEY = ['banners'] as const;

// ============================================================================
// products / product 商品域
// ============================================================================
export const PRODUCTS_QUERY_KEY = ['products'] as const;
export const PRODUCT_DETAIL_KEY = (id: string | undefined) => ['product', id] as const;
export const PRODUCT_RECOMMEND_KEY = (offset: number) => ['products', 'recommend', offset] as const;
export const PRODUCT_RECOMMEND_INFINITE_KEY = (baseOffset: number, cycle: number, limit: number) =>
  ['products', 'recommend-infinite', baseOffset, cycle, limit] as const;
export const PRODUCT_BUY_AGAIN_KEY = (offset: number) => ['products', 'buy-again', offset] as const;
export const PRODUCT_FREQUENT_BUNDLE_KEY = (limit: number) =>
  ['products', 'frequent-bundle', limit] as const;
export const PRODUCT_SEARCH_KEY = (keyword: string, sortBy: string) =>
  ['products', 'search', keyword, sortBy] as const;
export const PRODUCTS_BY_CATEGORY_KEY = (categoryId: string | undefined) =>
  ['products', 'category', categoryId] as const;
export const PRODUCT_WAREHOUSE_AVAILABILITY_KEY = (
  id: string | undefined,
  lat: number | null,
  lng: number | null,
) => ['product', id, 'warehouse-availability', lat, lng] as const;

// ============================================================================
// cart 购物车 / checkout 结算
// ============================================================================
export const CART_ROOT_KEY = ['cart'] as const;
export const CART_QUERY_KEY = () => [...CART_ROOT_KEY] as const;
export const CHECKOUT_PREVIEW_KEY = (addressId: string, couponCode: string) =>
  ['checkout-preview', addressId, couponCode] as const;

// ============================================================================
// coupons 优惠券 / promotions 活动入口
// ============================================================================
export const COUPONS_QUERY_KEY = (status: string) => ['coupons', status] as const;
export const VALIDATE_COUPON_KEY = (code: string, orderAmount: number, deliveryFee: number) =>
  ['coupon-validate', code, orderAmount, deliveryFee] as const;
// Why: 领券中心第二段用 'available-templates' 与卡包 COUPONS_QUERY_KEY('available') 区分，
//      避免任一侧 invalidate 精确匹配误伤对方缓存（usePromotion.ts 原注释）。
export const AVAILABLE_COUPONS_KEY = ['coupons', 'available-templates'] as const;
export const PROMOTIONS_QUERY_KEY = ['promotions'] as const;

// ============================================================================
// orders 订单
// ============================================================================
export const ORDERS_QUERY_KEY = ['orders'] as const;
export const ORDERS_COUNTS_KEY = [...ORDERS_QUERY_KEY, 'counts'] as const;
export const ordersListKey = (status: OrderStatus[] | 'all') =>
  [...ORDERS_QUERY_KEY, status ?? 'all'] as const;
export const orderInfiniteKey = (tab: OrderTabKey) =>
  [...ORDERS_QUERY_KEY, 'infinite', tab] as const;
export const orderDetailKey = (id: string) => [...ORDERS_QUERY_KEY, 'detail', id] as const;

// ============================================================================
// order-eta 订单 ETA（轻量 hook，不落 ORDERS 前缀：getTracking 非 orders 缓存族）
// ============================================================================
export const ORDER_ETA_KEY = (orderId: string | undefined) => ['order-eta', orderId] as const;

// ============================================================================
// reviews 评论 / order-reviews 订单评价
// ============================================================================
export const REVIEWS_ROOT_KEY = ['reviews'] as const;
export const REVIEWS_QUERY_KEY = (productId: string) => [...REVIEWS_ROOT_KEY, productId] as const;
export const ORDER_REVIEWS_ROOT_KEY = ['order-reviews'] as const;
export const ORDER_REVIEWS_KEY = (orderId: string) => [...ORDER_REVIEWS_ROOT_KEY, orderId] as const;

// ============================================================================
// refunds 售后
// ============================================================================
export const REFUNDS_QUERY_KEY = ['refunds'] as const;
export const refundDetailKey = (id: string) => ['refunds', id] as const;

// ============================================================================
// user / favorites / addresses / payments
// ============================================================================
export const PROFILE_QUERY_KEY = ['user', 'profile'] as const;
export const FAVORITES_QUERY_KEY = ['user', 'favorites'] as const;
export const ADDRESSES_QUERY_KEY = ['addresses'] as const;
export const PAYMENTS_QUERY_KEY = ['payments', 'methods'] as const;

// ============================================================================
// notifications 通知
// ============================================================================
export const NOTIFICATIONS_QUERY_KEY = ['user', 'notifications'] as const;
export const UNREAD_COUNT_QUERY_KEY = ['user', 'notifications', 'unread-count'] as const;
export const notificationsListKey = (onlyUnread: boolean) =>
  [...NOTIFICATIONS_QUERY_KEY, onlyUnread ? 'unread' : 'all'] as const;
// Why: 与 NOTIFICATIONS_QUERY_KEY 前缀不同，互不误伤（useNotifications.ts 原注释）
export const NOTIFICATION_PREFS_KEY = ['user', 'notification-preferences'] as const;

// ============================================================================
// subscriptions 订阅提醒
// ============================================================================
export const SUBSCRIPTIONS_KEY = (type: string) => ['subscriptions', type] as const;

// ============================================================================
// search 热搜/联想（locale 入 key：后端按 Accept-Language 切片）
// ============================================================================
export const SEARCH_HOT_KEY = (locale: string, limit: number) =>
  ['search-hot', locale, limit] as const;
export const SEARCH_SUGGEST_KEY = (locale: string, prefix: string) =>
  ['search-suggest', locale, prefix] as const;
export const SEARCH_PRODUCTS_SUGGEST_KEY = (locale: string, prefix: string) =>
  ['search-products-suggest', locale, prefix] as const;

// ============================================================================
// onboarding 引导页
// ============================================================================
export const ONBOARDING_SLIDES_KEY = ['onboarding', 'slides'] as const;

// ============================================================================
// tickets 工单（替换品批2 工单化 2026-10-29）
// ============================================================================
export const TICKETS_QUERY_KEY = ['tickets'] as const;
export const ticketDetailKey = (ticketNo: string) => ['tickets', ticketNo] as const;
export const ticketEventsKey = (ticketNo: string) => ['tickets', ticketNo, 'events'] as const;
