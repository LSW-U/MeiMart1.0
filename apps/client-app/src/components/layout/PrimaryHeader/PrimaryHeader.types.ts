import type { ReactNode } from 'react';

export interface PrimaryHeaderProps {
  title: string;
  showBack?: boolean;
  onBackPress?: () => void;
  /** 右侧操作按钮（购物车/搜索/客服等） */
  rightActions?: ReactNode;
  /** 是否在标题下方显示定位 chip（HomePage 用） */
  showLocation?: boolean;
  /** 定位文本（与 showLocation 配套） */
  locationLabel?: string;
  /** 点击定位 chip 的回调 */
  onLocationPress?: () => void;
  /**
   * 标题是否视觉居中（相对整行，而非 back 按钮右侧的剩余空间）。
   * 默认 false（标题在剩余空间居中，back 按钮占位不均衡时标题会偏右）；
   * profile/edit 等表单页需要标题对屏幕居中时传 true
   */
  centerTitle?: boolean;
  testID?: string;
}
