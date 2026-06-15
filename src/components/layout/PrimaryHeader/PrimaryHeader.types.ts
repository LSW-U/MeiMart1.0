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
  testID?: string;
}
