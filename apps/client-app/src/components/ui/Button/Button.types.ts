import type { PressableProps } from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

// P1-11：Omit 追加 'style'——实现不消费 style，误传一律编译报错（原 EmptyState 传 marginTop 静默失效）
export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
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
