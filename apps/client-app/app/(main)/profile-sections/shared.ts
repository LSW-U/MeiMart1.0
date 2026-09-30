// 批5 拆分（C-P3-14）：从 app/(main)/profile.tsx 原样搬移的常量与配置数组，行为零变更
import type { Icon } from '@/components/ui/Icon';

type IconSymbol = Parameters<typeof Icon>[0]['symbol'];

// 默认头像 mock（HTML 第 150 行）
export const DEFAULT_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDTkRvY5IQj5crQ9J0WxeHh9B2lcLBNp6NrIk8FZoL0iBqr3sNYwIAnUgGA9a2lhDAGKNs0Y9WP7AFn3BXuHbbNV7ChtSLtV93tdcfLwqA5V1EEjiStXWYL7QF3KOaH2l2PSyl5nStpLu1j2Cein2M6_AQtoHf00DN0oQPQOhhyzWkt_l5Oaz_nW5Iw9W39bkQ1JLpw4LUIxhhdXtyzNK92y_yuLRTLO2aeZVgFGYM2UUOHzMkK6ya9RMSg3S47jxi0Fx098Wwl';

// 原因：红底 banner / primary header / 主按钮上的固定白字。两种模式都是品牌红底，白字正确不变。
// 不可用 colors['on-primary']：dark 模式下 on-primary 翻为 #690005（暗红），叠红底会裂色。
export const ON_PRIMARY = '#ffffff';

export interface OrderEntry {
  // id: OrderGroupKey | 'after-sales'（退款售后非订单状态，放宽 string 让其可加；badge 查 orderCounts 时 'after-sales' 无值不显示）
  id: string;
  labelKey:
    | 'order.statusToPay'
    | 'order.statusToShip'
    | 'order.statusToReceive'
    | 'order.actions.review'
    | 'profile.afterSales';
  icon: IconSymbol;
  route?: string;
}

// 订单入口宫格（HTML 第 170-197 行）- badge 由 useOrderCounts 派生（id 对应 ORDER_COUNT_MAP）
// 用户要求：去掉「待发货」+ 最后加「退款售后」入口（跳 /refunds 列表页）
export const ORDER_ENTRIES: OrderEntry[] = [
  {
    id: 'to-pay',
    labelKey: 'order.statusToPay',
    icon: 'account_balance_wallet',
    route: '/(main)/orders',
  },
  {
    id: 'to-receive',
    labelKey: 'order.statusToReceive',
    icon: 'local_shipping',
    route: '/(main)/orders',
  },
  { id: 'review', labelKey: 'order.actions.review', icon: 'star_rate', route: '/(main)/orders' },
  {
    id: 'after-sales',
    labelKey: 'profile.afterSales',
    icon: 'support_agent',
    route: '/(main)/refunds',
  },
];

export interface FunctionItem {
  id: string;
  labelKey: string;
  icon: IconSymbol;
  route?: string;
  isError?: boolean;
}

// P2 §3.4: 登录态功能菜单只留 地址/帮助/设置/退出（收藏/优惠券已合并到 usercard 统计条）
export const FUNCTION_ITEMS: FunctionItem[] = [
  { id: 'address', labelKey: 'address.list', icon: 'location_on', route: '/address/list' },
  { id: 'help', labelKey: 'profile.help', icon: 'help', route: '/service/help' },
  { id: 'settings', labelKey: 'profile.settings', icon: 'settings', route: '/settings' },
  { id: 'logout', labelKey: 'profile.logout', icon: 'logout', isError: true },
];

// P2 §8: 未登录态无 usercard 统计条 -> 收藏/优惠券入口必须留在功能菜单里
export const FUNCTION_ITEMS_EMPTY: FunctionItem[] = [
  { id: 'favorites', labelKey: 'profile.favorites', icon: 'favorite', route: '/favorites' },
  { id: 'coupons', labelKey: 'profile.coupons', icon: 'confirmation_number', route: '/coupons' },
  { id: 'address', labelKey: 'address.list', icon: 'location_on', route: '/address/list' },
  { id: 'help', labelKey: 'profile.help', icon: 'help', route: '/service/help' },
  { id: 'settings', labelKey: 'profile.settings', icon: 'settings', route: '/settings' },
];

// P2 §6: Discover 快捷功能宫格 - C1 仅 UI + toast 占位，功能后续按 F2->F1->F4->F3 实现
// isNew 角标已下线（2026-08-27 用户手调移除两处使用，字段+渲染分支+样式连根清，审查 Q3）
export interface DiscoverEntry {
  id: string;
  labelKey: string;
  icon: IconSymbol;
}
export const DISCOVER_ENTRIES: DiscoverEntry[] = [
  { id: 'invite', labelKey: 'profile.invite', icon: 'group_add' },
  { id: 'history', labelKey: 'profile.history', icon: 'history' },
  { id: 'becomeSeller', labelKey: 'profile.becomeSeller', icon: 'storefront' },
  { id: 'scan', labelKey: 'profile.scan', icon: 'qr_code_scanner' },
];
