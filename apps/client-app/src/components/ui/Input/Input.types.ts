import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';
import type { TextInputProps } from 'react-native';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface InputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  /** 标签（输入框上方） */
  label?: string;
  /** 错误信息（错误态） */
  error?: string;
  /** 左侧图标名（@expo/vector-icons MaterialCommunityIcons） */
  leftIcon?: IconName;
  /** 右侧图标名 */
  rightIcon?: IconName;
  /** 点击右侧图标回调 */
  onRightIconPress?: () => void;
  /** 当前值 */
  value?: string;
  /** 文本变化回调 */
  onChangeText?: (text: string) => void;
  /** 辅助说明 */
  helperText?: string;
  /** 禁用状态（映射到 TextInput editable={false}） */
  disabled?: boolean;
}
