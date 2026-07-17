/**
 * 公共预设常量（提取重复声明的属性）
 *
 * Why: 统一管理高频重复的属性，减少冗余声明，保证全局一致
 * - fontFamilies: typography 内部复用（标题 serif / 正文 sans）
 * - defaultHitSlop: 所有可点击组件的触控热区（WCAG 2.2 触控目标 ≥44px）
 * - defaultEllipsis: 动态文本（商品名/地址）截断规则
 *
 * 用法：
 *   import { defaultHitSlop, defaultEllipsis } from '@/theme';
 *   <Pressable hitSlop={defaultHitSlop} />
 *   <Text {...defaultEllipsis}>{longText}</Text>
 */

import type { TextProps } from 'react-native';

/** 字体家族常量（typography.ts 内部复用，避免字符串重复） */
export const fontFamilies = {
  serif: 'NotoSerif',
  sans: 'PlusJakartaSans',
} as const;

/**
 * 默认触控热区（8px 外扩，保证点击区域 ≥44px）
 * Why: 全局 73 处 Pressable 重复声明 hitSlop={8}，统一提取
 * 旧代码不强制改，新代码用此常量
 */
export const defaultHitSlop = {
  top: 8,
  bottom: 8,
  left: 8,
  right: 8,
} as const;

/**
 * 默认文本截断规则（2 行 + 尾部省略）
 * Why: 商品名/地址/评价等动态文本统一截断，避免布局溢出
 */
export const defaultEllipsis: Pick<TextProps, 'numberOfLines' | 'ellipsizeMode'> = {
  numberOfLines: 2,
  ellipsizeMode: 'tail',
};

/**
 * 单行文本截断（用于标签、列表项等空间紧凑场景）
 */
export const singleLineEllipsis: Pick<TextProps, 'numberOfLines' | 'ellipsizeMode'> = {
  numberOfLines: 1,
  ellipsizeMode: 'tail',
};
