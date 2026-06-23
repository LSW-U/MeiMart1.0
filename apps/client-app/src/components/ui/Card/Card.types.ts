import type { PropsWithChildren } from 'react';
import type { ViewStyle } from 'react-native';

export interface CardProps extends PropsWithChildren {
  /** 点击回调（提供则渲染为 Pressable） */
  onPress?: () => void;
  /** 阴影 */
  elevated?: boolean;
  /** 内边距 */
  padding?: number;
  /** 自定义样式 */
  style?: ViewStyle | ViewStyle[];
  /** 测试 ID */
  testID?: string;
  /** a11y 标签 */
  accessibilityLabel?: string;
}
