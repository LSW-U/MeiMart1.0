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
}
