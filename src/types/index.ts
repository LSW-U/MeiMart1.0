/**
 * 业务数据类型定义（v0.3 Task 3.1）
 * 所有业务组件的 Props 类型从本文件导出
 */
import type { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function toIconName(name: string): IconName {
  return name as IconName;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  rating?: number;
  salesCount?: number;
  description?: string;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selected: boolean;
}

export interface Cart {
  items: CartItem[];
  totalPrice: number;
  totalItems: number;
}

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunding';

export interface Order {
  id: string;
  orderNo: string;
  status: OrderStatus;
  items: CartItem[];
  totalPrice: number;
  createdAt: string;
  address?: Address;
  trackingNo?: string;
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
}

export type CouponType = 'percentage' | 'fixed';

export interface Coupon {
  id: string;
  name: string;
  discount: number;
  type: CouponType;
  minPurchase: number;
  validUntil: string;
  used: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  parentId?: string;
}

export interface Banner {
  id: string;
  image: string;
  title: string;
  link?: string;
}

export type NotificationType = 'order' | 'promotion' | 'system';

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  content: string;
  images?: string[];
  createdAt: string;
}

export interface TrackingStep {
  status: string;
  description: string;
  timestamp: string;
  location?: string;
}

export type OrderTab = 'all' | 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export type BottomTab = 'home' | 'categories' | 'cart' | 'orders' | 'account';
