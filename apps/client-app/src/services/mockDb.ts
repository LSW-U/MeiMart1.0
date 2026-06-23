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

import type {
  Product,
  Category,
  Banner,
  Cart,
  Order,
  Address,
  User,
  Coupon,
  Notification,
  PaymentMethod,
} from '@/types';

export const mockDb = {
  products: productsData as Product[],
  categories: categoriesData as Category[],
  banners: bannersData as Banner[],
  cart: cartData as Cart,
  orders: ordersData as Order[],
  addresses: addressesData as Address[],
  user: userData as User,
  coupons: couponsData as Coupon[],
  notifications: notificationsData as Notification[],
  payments: paymentsData as PaymentMethod[],
  favorites: [productsData[0] as Product, productsData[3] as Product, productsData[7] as Product],
};

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export async function mockResponse<T>(data: T, ms = 300): Promise<T> {
  await delay(ms);
  return structuredCloneSafe(data);
}

function structuredCloneSafe<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}
