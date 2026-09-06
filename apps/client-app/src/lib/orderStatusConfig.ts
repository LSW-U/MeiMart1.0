import type { IconName, OrderStatus } from '@/types';
import type { AppColors } from '@/theme/colors';

// Why: 后端 OrderStatus 有 10 个值，前端组件需要为每个状态展示文案/颜色/图标/操作按钮。
// 集中管理避免散落在 OrderCard / OrderDetailPage / OrderListPage 三处组件，改一处即生效。

export interface OrderStatusVisual {
  /** UI 显示文案 i18n key（order.statusLabels.*，zh/en/tet/pt 4 语齐） */
  labelKey: string;
  /** MaterialCommunityIcons 图标名 */
  icon: IconName;
}

export const ORDER_STATUS_VISUAL: Record<OrderStatus, OrderStatusVisual> = {
  PENDING_PAYMENT: {
    labelKey: 'order.statusLabels.PENDING_PAYMENT',
    icon: 'clock-outline' as IconName,
  },
  PENDING_CONFIRM: {
    labelKey: 'order.statusLabels.PENDING_CONFIRM',
    icon: 'clock-check-outline' as IconName,
  },
  CONFIRMED: {
    labelKey: 'order.statusLabels.CONFIRMED',
    icon: 'check-circle-outline' as IconName,
  },
  PICKED: {
    labelKey: 'order.statusLabels.PICKED',
    icon: 'package-variant-closed' as IconName,
  },
  OUT_FOR_DELIVERY: {
    labelKey: 'order.statusLabels.OUT_FOR_DELIVERY',
    icon: 'truck-delivery-outline' as IconName,
  },
  DELIVERED_PAID: {
    labelKey: 'order.statusLabels.DELIVERED_PAID',
    icon: 'check-circle-outline' as IconName,
  },
  DELIVERED_UNPAID: {
    labelKey: 'order.statusLabels.DELIVERED_UNPAID',
    icon: 'check-circle-outline' as IconName,
  },
  DELIVERED: {
    labelKey: 'order.statusLabels.DELIVERED',
    icon: 'check-circle-outline' as IconName,
  },
  COMPLETED: {
    labelKey: 'order.statusLabels.COMPLETED',
    icon: 'star-check-outline' as IconName,
  },
  CANCELLED: {
    labelKey: 'order.statusLabels.CANCELLED',
    icon: 'close-circle-outline' as IconName,
  },
};

// Why: 状态 → 语义角色映射。pill 配色不再硬编码 hex，统一走 theme.semantic
// （success/info/warning/error + container），dark mode 自动适配。
type StatusSemanticRole = 'warning' | 'info' | 'success' | 'error';

const STATUS_SEMANTIC: Record<OrderStatus, StatusSemanticRole> = {
  PENDING_PAYMENT: 'warning',
  PENDING_CONFIRM: 'warning',
  CONFIRMED: 'info',
  PICKED: 'info',
  OUT_FOR_DELIVERY: 'info',
  DELIVERED_PAID: 'success',
  DELIVERED_UNPAID: 'success',
  DELIVERED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

// Why: dot/fg 当前统一指向同一 semantic 主色（简化优先）。
// 旧版 pill 的 dot 比 fg 更亮（如蓝 #3b82f6 vs #1d4ed8），统一后 dot 会变深一点；
// 真机看效果，若层次感不足再在 SemanticColors 加 dot 变体（info-dot 等）。
const SEMANTIC_PILL_KEYS: Record<
  StatusSemanticRole,
  {
    bg: keyof AppColors['semantic'];
    fg: keyof AppColors['semantic'];
    dot: keyof AppColors['semantic'];
  }
> = {
  warning: { bg: 'warning-container', fg: 'warning', dot: 'warning' },
  info: { bg: 'info-container', fg: 'info', dot: 'info' },
  success: { bg: 'success-container', fg: 'success', dot: 'success' },
  error: { bg: 'error-container', fg: 'error', dot: 'error' },
};

export function getStatusPill(
  status: OrderStatus,
  colors: AppColors,
): { bg: string; fg: string; dot: string } {
  const role = STATUS_SEMANTIC[status];
  const keys = SEMANTIC_PILL_KEYS[role];
  return {
    bg: colors.semantic[keys.bg],
    fg: colors.semantic[keys.fg],
    dot: colors.semantic[keys.dot],
  };
}

export type OrderAction = 'pay' | 'cancel' | 'track' | 'review' | 'repurchase' | 'after-sales';

export interface OrderActionDescriptor {
  /** 按钮文案 i18n key（order.actionLabels.*，zh/en/tet/pt 4 语齐） */
  labelKey: string;
  action: OrderAction;
  primary?: boolean;
}

// Why: 不同状态显示不同操作按钮，集中管理避免 OrderCard 散落 switch
// Why: labelKey 按「按钮语义」而非 action 建（同一 action=track 在待确认态显示 Details、
//      配送态显示 Track，文案不同），文案 4 语在 locales/*.json order.actionLabels.* 维护
export function getOrderActions(status: OrderStatus): OrderActionDescriptor[] {
  switch (status) {
    case 'PENDING_PAYMENT':
      return [
        { labelKey: 'order.actionLabels.cancelOrder', action: 'cancel' },
        { labelKey: 'order.actionLabels.payNow', action: 'pay', primary: true },
      ];
    case 'PENDING_CONFIRM':
    case 'CONFIRMED':
      return [{ labelKey: 'order.actionLabels.viewDetails', action: 'track' }];
    case 'PICKED':
    case 'OUT_FOR_DELIVERY':
      return [{ labelKey: 'order.actionLabels.trackShipment', action: 'track', primary: true }];
    case 'DELIVERED_PAID':
    case 'DELIVERED_UNPAID':
    case 'DELIVERED':
      return [
        { labelKey: 'order.actionLabels.afterSales', action: 'after-sales' },
        { labelKey: 'order.actionLabels.review', action: 'review', primary: true },
      ];
    case 'COMPLETED':
      return [{ labelKey: 'order.actionLabels.buyAgain', action: 'repurchase', primary: true }];
    case 'CANCELLED':
      return [{ labelKey: 'order.actionLabels.buyAgain', action: 'repurchase', primary: true }];
  }
}

// P12 Commit 2: Tab key 改成 group key（1 tab 对应多 status），修复 B2 漏 5 状态
// Why: 原 1 tab = 1 status 漏状态（待发货只查 CONFIRMED 漏 PENDING_CONFIRM；待收货漏 PICKED；
//      已送达漏 DELIVERED_PAID/UNPAID/COMPLETED），改成 group 后与 useOrderCounts 共用
//      ORDER_STATUS_GROUPS 单一来源，避免两处定义漂移
// Why: 显式 OrderGroupKey 而非 keyof typeof，避免 satisfies/字面量推断导致 .includes() 参数 never
export type OrderGroupKey = 'to-pay' | 'to-ship' | 'to-receive' | 'review';

export const ORDER_STATUS_GROUPS: Record<OrderGroupKey, OrderStatus[]> = {
  'to-pay': ['PENDING_PAYMENT'],
  'to-ship': ['PENDING_CONFIRM', 'CONFIRMED'],
  'to-receive': ['PICKED', 'OUT_FOR_DELIVERY'],
  review: ['DELIVERED', 'DELIVERED_PAID', 'DELIVERED_UNPAID', 'COMPLETED'],
};

export type OrderTabKey = 'all' | OrderGroupKey;

export interface OrderTab {
  key: OrderTabKey;
  labelKey: string;
  /** 业务 Tab 显示角标计数，all 不显示 */
  countable: boolean;
}

export const ORDER_TABS: OrderTab[] = [
  { key: 'all', labelKey: 'common.all', countable: false },
  { key: 'to-pay', labelKey: 'order.statusToPay', countable: true },
  { key: 'to-ship', labelKey: 'order.statusToShip', countable: true },
  { key: 'to-receive', labelKey: 'order.statusToReceive', countable: true },
  // Why: key 复用 review（与 useOrderCounts/profile 4 宫格一致，状态集相同），
  //      labelKey 用 tabDelivered（Tab 场景显示「已送达」比 status.delivered「已完成」语义更准）
  { key: 'review', labelKey: 'order.tabDelivered', countable: true },
];

// Why: tab key → statuses，供 useOrdersInfinite 查询用（all 表示不过滤）
export function tabStatuses(key: OrderTabKey): OrderStatus[] | 'all' {
  return key === 'all' ? 'all' : ORDER_STATUS_GROUPS[key];
}
