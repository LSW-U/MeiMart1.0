import type { StyleProp, ViewStyle } from 'react-native';

export type BadgeVariant = 'dot' | 'number';

export interface BadgeProps {
  /** 显示数量（dot 变体时仅判断 >0） */
  count?: number;
  /** 变体 */
  variant?: BadgeVariant;
  /** 数字变体的最大显示值（超过显示 N+） */
  maxCount?: number;
  /** 自定义背景色（默认 primary） */
  color?: string;
  /** a11y */
  accessibilityLabel?: string;
  /**
   * 对无障碍树隐藏（P1-21）：外层容器 label 已含数量信息时，内层角标不再重复播报
   * （如 CartIconButton：按钮 label=「购物车 N 件」，角标本体静默）。
   */
  hideFromA11y?: boolean;
  /** 自定义样式（用于 absolute 定位等；实现内以数组展开，接受 StyleProp——P1-21 CartIconButton 传合并数组） */
  style?: StyleProp<ViewStyle>;
}
