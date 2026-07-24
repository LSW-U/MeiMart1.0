import type { ShortcutThemeKey } from '@/theme';

export interface PromoShortcutItem {
  /** 快捷入口 id，同时作为主题色板 key（颜色统一从 shortcutThemes 取） */
  id: ShortcutThemeKey;
  /** 小标签（HTML 的 "SAVE BIG"） */
  label: string;
  /** 大标题（HTML 的 "Deals"） */
  title: string;
  /** Material Symbols 图标名称（自动映射） */
  icon: string;
  /** 角花装饰（仅 Deals 卡片） */
  withCorner?: boolean;
  link?: string;
}

export interface PromoShortcutProps {
  items: PromoShortcutItem[];
  onPress?: (item: PromoShortcutItem) => void;
  testID?: string;
}
