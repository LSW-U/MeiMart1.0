export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  /** 图片 URL（可选，未提供则显示 fallback 首字母） */
  uri?: string;
  /** 尺寸 */
  size?: AvatarSize;
  /** 是否可编辑（显示铅笔徽章） */
  editable?: boolean;
  /** 点击回调 */
  onPress?: () => void;
  /** 未提供 uri 时的首字母（最多取 2 个字符） */
  fallback?: string;
  /** 测试 ID */
  testID?: string;
}
