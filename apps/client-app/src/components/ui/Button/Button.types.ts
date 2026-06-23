import type { PressableProps } from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  /** 按钮变体 */
  variant?: ButtonVariant;
  /** 按钮尺寸 */
  size?: ButtonSize;
  /** 加载态（显示 spinner 并禁用点击） */
  loading?: boolean;
  /** 禁用态 */
  disabled?: boolean;
  /** 全宽 */
  fullWidth?: boolean;
  /** 显示文字 */
  label: string;
  /** 点击事件 */
  onPress?: () => void;
  /** 可访问性描述 */
  accessibilityHint?: string;
}
