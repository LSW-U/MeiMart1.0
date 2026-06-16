/**
 * 字体主题（源自 HTML 原型的 fontSize 配置）
 * 字体家族：Noto Serif（标题）+ Plus Jakarta Sans（正文）
 * 字号共 8 种，对应 HTML 的 fontSize 配置
 */

import type { TextStyle } from 'react-native';

type TypographyToken = {
  fontFamily: 'NotoSerif' | 'PlusJakartaSans';
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '600' | '700';
  letterSpacing?: number;
};

export type TypographyKey =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body-lg'
  | 'body-md'
  | 'body-sm'
  | 'label-caps'
  | 'price-display';

export const typography: Record<TypographyKey, TypographyToken> = {
  h1: {
    fontFamily: 'NotoSerif',
    fontSize: 32,
    lineHeight: 32 * 1.2,
    fontWeight: '700',
  },
  h2: {
    fontFamily: 'NotoSerif',
    fontSize: 24,
    lineHeight: 24 * 1.3,
    fontWeight: '700',
  },
  h3: {
    fontFamily: 'NotoSerif',
    fontSize: 20,
    lineHeight: 20 * 1.4,
    fontWeight: '600',
  },
  'body-lg': {
    fontFamily: 'PlusJakartaSans',
    fontSize: 18,
    lineHeight: 18 * 1.6,
    fontWeight: '400',
  },
  'body-md': {
    fontFamily: 'PlusJakartaSans',
    fontSize: 16,
    lineHeight: 16 * 1.5,
    fontWeight: '400',
  },
  'body-sm': {
    fontFamily: 'PlusJakartaSans',
    fontSize: 14,
    lineHeight: 14 * 1.5,
    fontWeight: '400',
  },
  'label-caps': {
    fontFamily: 'PlusJakartaSans',
    fontSize: 12,
    lineHeight: 12 * 1.2,
    fontWeight: '700',
    letterSpacing: 12 * 0.05,
  },
  'price-display': {
    fontFamily: 'PlusJakartaSans',
    fontSize: 20,
    lineHeight: 20 * 1.0,
    fontWeight: '700',
  },
};

export type Typography = typeof typography;

function resolveFontFamily(token: TypographyToken): string {
  const base = token.fontFamily;
  if (token.fontWeight === '700') return `${base}-Bold`;
  if (token.fontWeight === '600') return `${base}-SemiBold`;
  return base;
}

/**
 * 将 typography token 转换为 RN TextStyle（用于 StyleSheet）
 * 注意：fontFamily 已包含权重后缀（-Bold / -SemiBold），以兼容 Android 字体变体匹配。
 * 字体由 AppProviders 通过 @expo-google-fonts useFonts 加载。
 */
export function textStyle(key: TypographyKey): TextStyle {
  const token = typography[key];
  return {
    fontFamily: resolveFontFamily(token),
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
    fontWeight: token.fontWeight,
    ...(token.letterSpacing !== undefined ? { letterSpacing: token.letterSpacing } : {}),
  };
}
