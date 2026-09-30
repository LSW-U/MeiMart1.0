// 订单详情页共享：状态视觉映射 + ON_PRIMARY 常量（批5 拆分：从 app/order/[id].tsx 原样搬移，行为零变更）
import type { OrderStatus } from '@/types';
import type { StatusBannerPaletteKey } from '@/theme';

// 原因：红底白字 dark 不变（Header/done dot/solidBtn/laisPayBadge 都是 colors.primary 红底白字，与 P2-P7 ON_PRIMARY const 模式一致）
export const ON_PRIMARY = '#ffffff';

// === 状态视觉映射 ===

export type StatusVisual = {
  /** 状态色板 key（颜色统一从 statusBannerPalettes 取，不再内联 hex） */
  palette: StatusBannerPaletteKey;
  /** 状态徽章 i18n key（复用 order.status.*，渲染时 toUpperCase 保持大写视觉） */
  badgeTextKey: string;
  /** Banner 顶部小标签 i18n key（order.bannerLabel.*，渲染时 toUpperCase） */
  bannerLabelKey: string;
  /** Banner 主文案 i18n key（order.bannerValue.*） */
  bannerValueKey: string;
  /** Banner 图标名（Material Symbols） */
  bannerIconSymbol: string;
};

// Why: STATUS_VISUAL 存 i18n key（纯数据，不依赖 t），渲染处 t() + toUpperCase。
// badgeTextKey 复用 order.status.*（PENDING_CONFIRM→confirming、CONFIRMED→confirmed 拆开，
// PICKED/OUT_FOR_DELIVERY→shipped、DELIVERED_*/COMPLETED→delivered、CANCELLED→cancelled）。
// bannerLabelKey/bannerValueKey 用 order.bannerLabel.*/order.bannerValue.* 子命名空间（新增）。
export const STATUS_VISUAL: Record<OrderStatus, StatusVisual> = {
  // 待付款（PROCESSING 等价的橙色）
  PENDING_PAYMENT: {
    palette: 'pending',
    badgeTextKey: 'order.status.pending',
    bannerLabelKey: 'order.bannerLabel.paymentDeadline',
    bannerValueKey: 'order.bannerValue.completePaymentSoon',
    bannerIconSymbol: 'schedule',
  },
  // 待确认（已付款等审核，颜色同 PENDING_PAYMENT）— P10：badge 从 paid 拆出，避免误显"待发货"
  PENDING_CONFIRM: {
    palette: 'pending',
    badgeTextKey: 'order.status.confirming',
    bannerLabelKey: 'order.bannerLabel.orderStatus',
    bannerValueKey: 'order.bannerValue.beingConfirmed',
    bannerIconSymbol: 'hourglass_empty',
  },
  // 已确认（PROCESSING 配色）— P10：badge 从 paid 拆出；无 DeliveryTask 无真实 ETA，banner 用泛化备货文案
  CONFIRMED: {
    palette: 'pending',
    badgeTextKey: 'order.status.confirmed',
    bannerLabelKey: 'order.bannerLabel.estimatedDelivery',
    bannerValueKey: 'order.bannerValue.preparing',
    bannerIconSymbol: 'local_shipping',
  },
  // 已拣货（同 SHIPPED 配色）
  PICKED: {
    palette: 'pending',
    badgeTextKey: 'order.status.shipped',
    bannerLabelKey: 'order.bannerLabel.estimatedDelivery',
    bannerValueKey: 'order.bannerValue.packagePicked',
    bannerIconSymbol: 'inventory_2',
  },
  // 配送中 — HTML DeliveryTrackingPage2
  OUT_FOR_DELIVERY: {
    palette: 'pending',
    badgeTextKey: 'order.status.shipped',
    bannerLabelKey: 'order.bannerLabel.estimatedDelivery',
    // Why: 用户决策 A — 泛化文案去掉写死的「5:30 PM」（mock 占位 real 模式失真，ETA 已在地址卡 B9 展示）
    bannerValueKey: 'order.bannerValue.outForDelivery',
    bannerIconSymbol: 'local_shipping',
  },
  // 已送达（已付款） — HTML DeliveryTrackingPage3
  DELIVERED_PAID: {
    palette: 'delivered',
    badgeTextKey: 'order.status.delivered',
    bannerLabelKey: 'order.bannerLabel.deliveryStatus',
    bannerValueKey: 'order.bannerValue.deliveredEnjoyed',
    bannerIconSymbol: 'check_circle',
  },
  // 已送达（货到付款）
  DELIVERED_UNPAID: {
    palette: 'delivered',
    badgeTextKey: 'order.status.delivered',
    bannerLabelKey: 'order.bannerLabel.paymentOnDelivery',
    bannerValueKey: 'order.bannerValue.deliveredPayRider',
    bannerIconSymbol: 'payments',
  },
  // 已送达（通用）
  DELIVERED: {
    palette: 'delivered',
    badgeTextKey: 'order.status.delivered',
    bannerLabelKey: 'order.bannerLabel.deliveryStatus',
    bannerValueKey: 'order.bannerValue.deliveredEnjoyed',
    bannerIconSymbol: 'check_circle',
  },
  // 已完成
  COMPLETED: {
    palette: 'delivered',
    badgeTextKey: 'order.status.delivered',
    bannerLabelKey: 'order.bannerLabel.orderCompleted',
    bannerValueKey: 'order.bannerValue.orderCompletedThanks',
    bannerIconSymbol: 'task_alt',
  },
  // 已取消
  CANCELLED: {
    palette: 'cancelled',
    badgeTextKey: 'order.status.cancelled',
    bannerLabelKey: 'order.bannerLabel.orderCancelled',
    bannerValueKey: 'order.bannerValue.orderCancelled',
    bannerIconSymbol: 'cancel',
  },
};
