/**
 * 空间主题（源自 HTML 原型的 spacing / borderRadius 配置）
 * 单位：像素
 *
 * 设计：尺度（t-shirt sizing）与语义（布局专用）拆成两个对象，
 * 避免一个对象里 xs/sm/md 与 gutter/container-margin 混排导致心智负担。
 */

// 尺度：纯大小梯度，按升序
export type SpacingKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export type Spacing = typeof spacing;

// 语义：布局专用间距（源自 HTML 原型的 container / gutter 概念）
export type LayoutKey = 'gutter' | 'container-margin';

export const layout = {
  gutter: 12,
  'container-margin': 20,
} as const;

export type Layout = typeof layout;

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
