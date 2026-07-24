/**
 * 服务入口图标主题色板（源自 HTML 原型 service/CustomerServicePage + HelpCenterPage）
 *
 * 设计：4 套语义色板（info 蓝 / success 翠 / warning 琥珀 / error 红），每套 2 角色：
 * bg（浅底，Tailwind xx-100）+ iconBg（图标实心底，Tailwind xx-500）。
 *
 * Why 独立模块不直接用 semantic token：bg 与 semantic.*-container 同值，但 iconBg 用的是
 * Tailwind xx-500（#3b82f6/#10b981/#f59e0b/#ef4444），与 semantic 主色（#1d4ed8/#059669/#F57C00/
 * #C62828）不同档；直接套 semantic 主色会产生可见色阶偏移，违反规则 27/28。故保留独立色板。
 *
 * 复用：service/index.tsx（渠道 online/phone/email/faq）与 service/help.tsx（分类
 * order/payment/shipping/return）共用同一套色板，各自映射 domain id → 语义 key。
 */

export type ServiceEntryThemeKey = 'info' | 'success' | 'warning' | 'error';

export interface ServiceEntryTheme {
  /** 浅底色（Tailwind xx-100，= semantic.*-container 值） */
  bg: string;
  /** 图标实心底色（Tailwind xx-500） */
  iconBg: string;
}

export const serviceEntryThemes: Record<ServiceEntryThemeKey, ServiceEntryTheme> = {
  info: { bg: '#dbeafe', iconBg: '#3b82f6' },
  success: { bg: '#d1fae5', iconBg: '#10b981' },
  warning: { bg: '#fef3c7', iconBg: '#f59e0b' },
  error: { bg: '#fee2e2', iconBg: '#ef4444' },
};
