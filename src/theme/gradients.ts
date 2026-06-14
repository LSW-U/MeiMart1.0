/**
 * 渐变预设（基于 expo-linear-gradient）
 *
 * 翻译自 HTML 原型的 Tailwind `bg-gradient-*`：
 * - `bg-gradient-to-r from-primary/90 to-transparent` → primaryFade（左→右，主色到透明）
 * - `bg-gradient-to-r from-emerald-900/90 to-transparent` → emeraldFade
 * - `bg-gradient-to-b from-primary to-primary-container` → brand
 *
 * 用法：
 *   import { LinearGradient } from 'expo-linear-gradient';
 *   import { gradientPresets } from '@/theme';
 *   <LinearGradient {...gradientPresets.brand} style={styles.banner} />
 *
 * 注意：HTML 原型使用 Tailwind 任意颜色（emerald-700, blue-700 等）作为 banner 背景。
 * RN 侧统一使用主题色板（primary/tertiary/secondary）以保持暗色模式兼容。
 */
import type { LinearGradientProps } from 'expo-linear-gradient';

/**
 * 渐变预设定义：colors 数组 + 默认方向。
 * 调用方可在外层覆盖 style/start/end。
 */
export type GradientPreset = Pick<LinearGradientProps, 'colors' | 'start' | 'end'>;

const FADE_STOPS = ['rgba(150,24,19,0.9)', 'rgba(150,24,19,0)'] as const;
const DARK_GREEN_STOPS = ['#064e3b', 'rgba(6,78,59,0)'] as const;
const DARK_BLUE_STOPS = ['#1e3a8a', 'rgba(30,58,138,0)'] as const;

export const gradientPresets = {
  /** 主色横向往右淡出（替换 `bg-gradient-to-r from-primary/90 to-transparent`） */
  primaryFade: {
    colors: [...FADE_STOPS],
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
  },
  /** 翡翠绿横向往右淡出（new user banner） */
  emeraldFade: {
    colors: [...DARK_GREEN_STOPS],
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
  },
  /** 蓝色横向往右淡出（free delivery banner） */
  blueFade: {
    colors: [...DARK_BLUE_STOPS],
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
  },
  /** 主色到主容器，纵向从上到下（按钮/品牌横幅） */
  brand: {
    colors: ['#961813', '#b83228'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  /** 暖白纵向（页面顶部到主背景） */
  warmSurface: {
    colors: ['#FAF7F2', '#fff8f7'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
} as const satisfies Record<string, GradientPreset>;

export type GradientPresetKey = keyof typeof gradientPresets;
