import type { TextInputProps } from 'react-native';

export interface InputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  /** 标签（输入框上方） */
  label?: string;
  /** 错误信息（错误态） */
  error?: string;
  /** 左侧图标名（@expo/vector-icons MaterialCommunityIcons） */
  leftIcon?: string;
  /** 右侧图标名 */
  rightIcon?: string;
  /** 点击右侧图标回调 */
  onRightIconPress?: () => void;
  /** 当前值 */
  value?: string;
  /** 文本变化回调 */
  onChangeText?: (text: string) => void;
  /** 辅助说明 */
  helperText?: string;
}
