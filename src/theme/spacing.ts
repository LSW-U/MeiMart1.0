/**
 * 间距主题（源自 HTML 原型的 spacing 配置）
 * 单位：像素
 */

export type SpacingKey =
  | 'unit'
  | 'xs'
  | 'sm'
  | 'gutter'
  | 'container-margin'
  | 'md'
  | 'lg'
  | 'xl'
  | 'xxl';

export const spacing = {
  unit: 4,
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

/**
 * 阴影主题（源自 HTML 原型内联 shadow 值）
 */
export type ShadowKey =
  | 'floating-cart'
  | 'bottom-nav'
  | 'sticky-footer'
  | 'checkout-bar'
  | 'delivery-tracking'
  | 'stamp-button';

export const shadows: Record<ShadowKey, string> = {
  'floating-cart': '0px 4px 6px rgba(150,24,19,0.2)',
  'bottom-nav': '0px -4px 6px -1px rgba(38,24,22,0.1)',
  'sticky-footer': '0px -4px 20px rgba(0,0,0,0.05)',
  'checkout-bar': '0px -10px 20px rgba(0,0,0,0.02)',
  'delivery-tracking': '0px -4px 12px 0px rgba(93,66,0,0.05)',
  'stamp-button': '4px 4px 0px 0px rgba(141,112,108,0.2)',
};

export type Shadows = typeof shadows;
