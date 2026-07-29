/**
 * 业务数据类型定义（v0.3 Task 3.1）
 * 所有业务组件的 Props 类型从本文件导出
 */
import type { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { AppLocale } from '@/i18n';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type LocalizableText = Record<AppLocale, string>;

export function toIconName(name: string): IconName {
  return name as IconName;
}

export interface Product {
  id: string;
  name: LocalizableText;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  rating?: number;
  salesCount?: number;
  description?: LocalizableText;
  // Why: 加购需要 SKU ID（后端 cart items 主键是 skuId），列表接口不返回，详情接口返回
  defaultSkuId?: string;
  // Why: §7 库存接入 — 可选，后端不返回时 undefined，UI 按无库存信息降级（绿点「有货」）
  stock?: number;
  // Why: B11 商品分类名（多语言，后端 DTO 补充），UI 消费待第二梯队分类页/商品列表
  categoryName?: LocalizableText | null;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selected: boolean;
  // Why: 用户加购时选的规格（如「500g」「大份」），有则在小卡片分类下展示，无则隐藏
  spec?: string;
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
  // Why: 后端下单要求地址有经纬度（匹配仓库），地图选点后填充
  lat?: number | null;
  lng?: number | null;
}

export interface Cart {
  items: CartItem[];
  totalPrice: number;
  totalItems: number;
}

export interface PaymentMethod {
  id: string;
  /** 主标题，如 "LaisPay (Local Wallet)" */
  name: LocalizableText;
  /** 副标题，如 "Balance: $45.00" 或 "BNU / Mandiri" */
  subtitle?: LocalizableText;
  /** Material Symbols 图标名 */
  icon: string;
  /** 是否默认选中 */
  isDefault?: boolean;
}

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PENDING_CONFIRM'
  | 'CONFIRMED'
  | 'PICKED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED_PAID'
  | 'DELIVERED_UNPAID'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

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

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  // Why: P2 §4.2 会员/积分 - 可选，后端不返回时降级（隐藏 GOLD 标签 / 积分显 0）
  memberLevel?: string;
  points?: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  /** 背景色（如 '#ecfdf5' for emerald-50），用于圆形头像底色 */
  color?: string;
  /** 边框色（如 '#d1fae5' for emerald-100），与 color 配套 */
  borderColor?: string;
  /** 缩略图 URL（若提供则渲染圆形图片替代图标） */
  image?: string;
  parentId?: string;
}

export type BannerTheme = 'primary' | 'emerald' | 'blue';

export interface Banner {
  id: string;
  /** 背景图片 URL（叠加在 gradient 之上，opacity 较低） */
  image: string;
  /** 主标题（与 HTML 的 `<h2>` 对应） */
  title: string;
  /** 副标题 / 描述（可选） */
  description?: string;
  /** 行动号召按钮文字（如 "SHOP NOW"），可选 */
  ctaLabel?: string;
  /** 卡片色调（决定渐变方向 + 装饰色），可选 — 默认 primary */
  theme?: BannerTheme;
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
  // Why: §8 评论模块 — 评论归属的商品 id，详情页按此查询
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  content: string;
  images?: string[];
  // Why: §8 评论模块 — 评价标签（quality/fresh 等，复用 review.tsx 的 6 标签体系）
  tags?: string[];
  // Why: §8 评论模块 — 是否已验证购买，true 时评论卡显示绿色 ✓ Verified Purchase
  isVerified?: boolean;
  // Why: §8 评论模块 — ISO 时间戳，前端用 formatRelativeTime 渲染「2 days ago」
  createdAt: string;
  // Why: 后端 ReviewView 派生字段（real 模式）：评论所属订单 + 分类 + 头像
  orderId?: string;
  category?: 'PRODUCT' | 'DELIVERY';
  avatarUrl?: string;
}

export interface TrackingStep {
  status: string;
  description: string;
  timestamp: string;
  location?: string;
}

export type OrderTab = OrderStatus | 'all';

export type BottomTab = 'home' | 'categories' | 'cart' | 'orders' | 'account';
