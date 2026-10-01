import productsData from '../../mocks/data/products.json';
import categoriesData from '../../mocks/data/categories.json';
import bannersData from '../../mocks/data/banners.json';
import cartData from '../../mocks/data/cart.json';
import ordersData from '../../mocks/data/orders.json';
import addressesData from '../../mocks/data/addresses.json';
import userData from '../../mocks/data/user.json';
import couponsData from '../../mocks/data/coupons.json';
import notificationsData from '../../mocks/data/notifications.json';
import paymentsData from '../../mocks/data/payments.json';
import reviewsData from '../../mocks/data/reviews.json';

import type {
  Product,
  Category,
  Banner,
  Cart,
  Order,
  Address,
  User,
  Notification,
  PaymentMethod,
  Review,
} from '@/types';

// Why: mock coupons 数据是旧结构（mocks/data/coupons.json），promotion.ts adaptMockCoupon 桥接到 ClientCoupon。
//      不用 types/index.ts 的 Coupon（P4 删除），单独定义 mock 数据 schema。
export interface MockCouponRaw {
  id: string;
  name: string;
  discount: number;
  type: string; // 'fixed' | 'percentage'
  minPurchase: number;
  validUntil: string;
  used: boolean;
}

// 原因：批1 A4 透传后 Category.name/Banner.title/Notification.title·body/Review.content 类型
// string → LocalizableText，mock JSON 字面量仍是纯串——LocalizableText 兼容 string 运行时语义
// （i18n-core pickLocalized 纯串直通），但 TS 结构不兼容；经 unknown 单跳断言桥接（规则 36
// 允许的写法：unknown → T 直转，非 as unknown as 双跳）。迁移 mock JSON 为多语对象后可删。
// P2-3 收紧：cast 仅限受 LocalizableText 放宽影响的四类；products/cart/orders/favorites
// 恢复直接 as 断言（与其余 mock 字段同护栏，mock JSON 漂移时 tsc 仍报错）。
const cast = <T>(data: unknown): T => data as T;

export const mockDb = {
  products: productsData as Product[],
  categories: cast<Category[]>(categoriesData),
  banners: cast<Banner[]>(bannersData),
  cart: cartData as Cart,
  orders: ordersData as Order[],
  addresses: addressesData as Address[],
  user: userData as User,
  coupons: couponsData as MockCouponRaw[],
  notifications: cast<Notification[]>(notificationsData),
  payments: paymentsData as PaymentMethod[],
  favorites: [productsData[0], productsData[3], productsData[7]] as Product[],
  // Why: §8 评论模块 — mock 评论数据，可变数组（submitReview 直接 push 进来，跨页即可见）
  reviews: cast<Review[]>(reviewsData),
};

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export async function mockResponse<T>(data: T, ms = 300): Promise<T> {
  await delay(ms);
  return structuredCloneSafe(data);
}

function structuredCloneSafe<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}
