/**
 * 间距主题（源自 HTML 原型的 spacing 配置）
 * 单位：像素
 */

export type SpacingKey =
  | 'xs'
  | 'sm'
  | 'gutter'
  | 'container-margin'
  | 'md'
  | 'lg'
  | 'xl'
  | 'xxl';

export const spacing = {
  xs: 4,
  sm: 8,
  gutter: 12,
  'container-margin': 20,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export type Spacing = typeof spacing;

/**
 * 圆角主题（源自 HTML 原型的 borderRadius 配置）
 */
export const borderRadius = {
  DEFAULT: 4,
  sm: 2,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  full: 9999,
} as const;

export type BorderRadius = typeof borderRadius;
