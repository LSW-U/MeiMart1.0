/**
 * 活动入口（PromoDock）主题色板 — 横排功能停靠栏
 *
 * 来源：模块化处理/卡片模块/快捷入口模块统一方案 §2.4（2026-07-30 v3 · PromoDock 方案二）
 * 原型：模块化处理HTML/首页模块-分类网格+快捷入口-优化原型.html（dock2 色条方案）
 *
 * 设计：每个活动主题一套 3 角色色板（图标盒淡底 + 彩色图标 + 底部色条）。
 * 图标盒底部 5px 色条替代文字标签（方案二），视觉更紧凑。
 *
 * Why 不坍缩进 semantic 单 token：每个主题靠 iconBg(淡) -> iconColor(深) -> barColor(深)
 * 构成层次；这些是主题定义层（等同 theme/），hex 常量保留，消费方按角色名引用。
 *
 * 暗色模式：HTML 原型仅亮色；待 dark mode 落地时加 dark 变体。
 *
 * Why 替代 shortcutThemes.ts：PromoShortcut 2×2 网格废弃 -> PromoDock 横排，
 *   旧色板（deals/new/coupons/delivery 卡片底色）不适用，新建 deals/coupons/delivery/points 图标盒色板。
 */

export type PromotionTheme = 'deals' | 'coupons' | 'delivery' | 'points';

export interface PromotionThemeColors {
  /** 图标盒淡底色（Tailwind xx-50） */
  iconBg: string;
  /** 图标颜色（主色） */
  iconColor: string;
  /** 图标盒底部 5px 色条颜色（主色，与 iconColor 同） */
  barColor: string;
}

export const promotionThemes: Record<PromotionTheme, PromotionThemeColors> = {
  // 限时特惠（品牌红系）
  deals: {
    iconBg: '#fdecea',
    iconColor: '#961813',
    barColor: '#961813',
  },
  // 优惠券（文化金系）
  coupons: {
    iconBg: '#fffbeb',
    iconColor: '#b45309',
    barColor: '#b45309',
  },
  // 免费配送（蓝系）
  delivery: {
    iconBg: '#eff6ff',
    iconColor: '#1d4ed8',
    barColor: '#1d4ed8',
  },
  // 积分（翠绿系）
  points: {
    iconBg: '#f0fdf4',
    iconColor: '#16a34a',
    barColor: '#16a34a',
  },
};
