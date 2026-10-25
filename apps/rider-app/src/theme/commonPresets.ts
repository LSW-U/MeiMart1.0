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

/**
 * 44px 实热区最小尺寸档（图标钮等小控件的 min 尺寸下限）。
 * 批A 审查 smell #2 兑现（审查 20261025 复核补做）：魔法串收编进预设，
 * 与 defaultHitSlop 同居单源；消费方 className={`relative ${touchTargetClass} ...`}。
 */
export const touchTargetClass = 'min-h-11 min-w-11';
