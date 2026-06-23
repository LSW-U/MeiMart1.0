export type SkeletonVariant = 'text' | 'rect' | 'circle';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  variant?: SkeletonVariant;
  /** 自定义圆角（仅 rect 变体） */
  radius?: number;
  testID?: string;
}
