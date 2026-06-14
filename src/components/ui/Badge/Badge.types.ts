import type { ViewStyle } from 'react-native';

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
  /** 自定义样式（用于 absolute 定位等） */
  style?: ViewStyle;
}
