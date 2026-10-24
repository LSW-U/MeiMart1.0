/**
 * 公共预设常量（R-P0-5 · UI 走查 20261024）
 *
 * defaultHitSlop: 可点击组件默认触控热区——骑行戴手套场景 44px 是底线，
 * 此前全库 82 处 Pressable 0 处 hitSlop。形态对齐 client-app 同名常量，
 * 两端日后抽 packages/design-tokens 可直接合流。
 */

/** 默认触控热区（四周 8px 外扩，小尺寸控件补足 44px 触达） */
export const defaultHitSlop = {
  top: 8,
  bottom: 8,
  left: 8,
  right: 8,
} as const;
