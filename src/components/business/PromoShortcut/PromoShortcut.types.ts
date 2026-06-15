export interface PromoShortcutItem {
  id: string;
  /** 小标签（HTML 的 "SAVE BIG"） */
  label: string;
  /** 大标题（HTML 的 "Deals"） */
  title: string;
  /** Material Symbols 图标名称（自动映射） */
  icon: string;
  /** 卡片背景色（如 'rgba(150,24,19,0.05)' for primary/5） */
  bgColor: string;
  /** 卡片边框色（如 'rgba(150,24,19,0.2)' for primary/20） */
  borderColor: string;
  /** 小标签文字色 */
  labelColor: string;
  /** 大标题文字色 */
  titleColor: string;
  /** 大图标色（通常与 titleColor 相同，opacity 50%） */
  iconColor: string;
  /** 角花装饰（仅 Deals 卡片） */
  withCorner?: boolean;
  link?: string;
}

export interface PromoShortcutProps {
  items: PromoShortcutItem[];
  onPress?: (item: PromoShortcutItem) => void;
  testID?: string;
}
