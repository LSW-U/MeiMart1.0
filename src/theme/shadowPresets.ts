/**
 * RN 原生阴影预设（iOS shadow* + Android elevation）
 *
 * 翻译自 HTML 原型的 Tailwind `shadow-*` 类：
 * - `shadow-sm` → sm（卡片轻阴影）
 * - `shadow-md` → md（中等阴影）
 * - `shadow-lg` → lg（按钮/floating）
 * - `shadow-xl` → xl（弹层/模态）
 *
 * 用法：
 *   import { shadowPresets } from '@/theme';
 *   <View style={[styles.card, shadowPresets.md]} />
 *
 * shadowColor 默认黑色（不透明），调用方可在外层覆盖：
 *   [shadowPresets.md, { shadowColor: colors.primary }]
 *
 * 注意：spacing.ts 中的 `shadows` 是 CSS 字符串（仅供 web box-shadow 翻译参考），
 * 不可直接用于 RN StyleSheet；这里提供的是 RN 可用的等价物。
 */
import type { ViewStyle } from 'react-native';

export type ShadowPreset = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

const baseShadowColor = '#000';

export const shadowPresets: Record<'sm' | 'md' | 'lg' | 'xl', ShadowPreset> = {
  sm: {
    shadowColor: baseShadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: baseShadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: baseShadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  xl: {
    shadowColor: baseShadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 10,
  },
} as const;

export type ShadowPresetKey = keyof typeof shadowPresets;

/**
 * 把任意 ViewStyle 与阴影预设合并，并允许覆盖 shadowColor
 * （常见场景：用品牌色作为阴影色调）。
 *
 * 用法：
 *   const cardStyle = withShadow('lg', { shadowColor: colors.primary, backgroundColor: '#fff' });
 */
export function withShadow(preset: ShadowPresetKey, overrides: ViewStyle = {}): ViewStyle {
  return { ...shadowPresets[preset], ...overrides };
}
