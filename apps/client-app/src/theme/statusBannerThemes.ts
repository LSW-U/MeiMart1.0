/**
 * 订单状态横幅主题色板（源自 HTML 原型 order/OrderDetailPage + DeliveryTrackingPage）
 *
 * 设计：10 个订单状态共享 3 套色板（pending 蓝橙 / delivered 翠绿 / cancelled 红），
 * 每套 6 个角色字段（badgeBg / bannerBg / bannerBorder / bannerIcon / bannerLabelColor /
 * bannerValueColor）构成 banner 的视觉层次（浅底 → 边 → icon → 标签 → 描述）。
 *
 * Why 不坍缩进 semantic 单 token：banner 靠多档色阶（bg 8% 透明 / border 25% / icon 主色 /
 * label 中色 / value 深色）构建层次，坍缩会抹平 label/value 的文字层级，违反视觉保真。
 * 这些是主题定义层（等同 theme/），hex 常量保留，消费方按角色名引用。
 *
 * 暗色模式：HTML 原型仅亮色，darkColors 暂未覆盖场景色板；待 dark mode 落地时此处加 dark 变体。
 */

export type StatusBannerPaletteKey = 'pending' | 'delivered' | 'cancelled';

export interface StatusBannerTheme {
  /** 状态徽章背景色 */
  badgeBg: string;
  /** Banner 整体浅底色（主色 8% 透明） */
  bannerBg: string;
  /** Banner 边框色（主色 25% 透明） */
  bannerBorder: string;
  /** Banner 图标色（主色） */
  bannerIcon: string;
  /** Banner 顶部小标签文字色（中色） */
  bannerLabelColor: string;
  /** Banner 主文案文字色（深色） */
  bannerValueColor: string;
}

export const statusBannerPalettes: Record<StatusBannerPaletteKey, StatusBannerTheme> = {
  // 待付款 / 待确认 / 已确认 / 已拣货 / 配送中（蓝橙系）
  pending: {
    badgeBg: '#F97316',
    bannerBg: 'rgba(59,130,246,0.08)',
    bannerBorder: 'rgba(59,130,246,0.25)',
    bannerIcon: '#1d4ed8',
    bannerLabelColor: '#1e3a8a',
    bannerValueColor: '#0c2461',
  },
  // 已送达 / 已完成（翠绿系）
  delivered: {
    badgeBg: '#059669',
    bannerBg: 'rgba(16,185,129,0.08)',
    bannerBorder: 'rgba(16,185,129,0.25)',
    bannerIcon: '#059669',
    bannerLabelColor: '#065f46',
    bannerValueColor: '#064e3b',
  },
  // 已取消（红系）
  cancelled: {
    badgeBg: '#dc2626',
    bannerBg: 'rgba(220,38,38,0.08)',
    bannerBorder: 'rgba(220,38,38,0.25)',
    bannerIcon: '#dc2626',
    bannerLabelColor: '#991b1b',
    bannerValueColor: '#7f1d1d',
  },
};
