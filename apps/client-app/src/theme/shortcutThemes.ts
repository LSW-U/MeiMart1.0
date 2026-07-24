/**
 * 首页快捷入口主题色板（源自 HTML 原型 home/HeroPage 的 PromoShortcut 区块）
 *
 * 设计：4 个快捷入口各一套 5 角色色板（bg / border / label / title / icon），
 * 按 shortcut id 命名（语义），不按色系命名。
 *
 * Why 不坍缩进 semantic 单 token：每张卡靠 bg(浅) → border(中) → label/title(深) → icon
 * 多档色阶构成层次；坍缩会抹平 label/title 与 icon 的差异。这些是主题定义层（等同 theme/），
 * hex/rgba 常量保留，消费方按角色名引用。
 *
 * 暗色模式：HTML 原型仅亮色；待 dark mode 落地时加 dark 变体。
 */

export type ShortcutThemeKey = 'deals' | 'new' | 'coupons' | 'delivery';

export interface ShortcutTheme {
  /** 卡片背景色（主色 5% 透明 或 Tailwind xx-50） */
  bg: string;
  /** 卡片边框色（主色 20% 透明 或 Tailwind xx-100） */
  border: string;
  /** 小标签文字色（中色） */
  label: string;
  /** 大标题文字色（深色） */
  title: string;
  /** 大图标色（iconWrap 自带 50% opacity） */
  icon: string;
}

export const shortcutThemes: Record<ShortcutThemeKey, ShortcutTheme> = {
  // 限时特惠（品牌红系）
  deals: {
    bg: 'rgba(150,24,19,0.05)',
    border: 'rgba(150,24,19,0.2)',
    label: '#961813',
    title: '#961813',
    icon: '#961813',
  },
  // 新人专享（翠绿系）
  new: {
    bg: '#ecfdf5',
    border: '#d1fae5',
    label: '#047857',
    title: '#047857',
    icon: '#059669',
  },
  // 优惠券（文化金系）
  coupons: {
    bg: 'rgba(99,71,0,0.1)',
    border: 'rgba(99,71,0,0.2)',
    label: '#634700',
    title: '#000000',
    icon: '#634700',
  },
  // 免费配送（蓝系）
  delivery: {
    bg: '#eff6ff',
    border: '#bfdbfe',
    label: '#1d4ed8',
    title: '#1d4ed8',
    icon: '#2563eb',
  },
};
