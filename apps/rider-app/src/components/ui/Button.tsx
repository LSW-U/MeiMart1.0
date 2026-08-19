import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors } from '../../theme/colors';

type ButtonProps = {
  children: ReactNode;
  className?: string;
  textClassName?: string;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  indicatorColor?: string;
  // T5 审查修复 P1-1: 调用方覆盖背景色（tailwind 无 success key，成功态绿色必须 inline
  // style 注入；className 拼接无法表达，原想传 style 但组件无此 prop 落空）
  style?: StyleProp<ViewStyle>;
};

export function Button({
  children,
  className = '',
  textClassName = '',
  icon,
  disabled = false,
  loading = false,
  onPress,
  accessibilityLabel,
  indicatorColor = colors.surface,
  style,
}: ButtonProps) {
  // B1: 真实禁用——disabled/loading 都阻断 onPress，杜绝弱网连点重复提交
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof children === 'string' ? children : undefined)}
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={`h-14 flex-row items-center justify-center gap-2 rounded-lg bg-primary active:scale-[0.98] ${className}`}
      disabled={inactive}
      onPress={onPress}
      style={[style, { opacity: inactive ? 0.5 : 1 }]}
    >
      {loading ? <ActivityIndicator color={indicatorColor} testID="button-spinner" /> : null}
      <Text className={`text-xs font-bold tracking-wider text-white ${textClassName}`}>{children}</Text>
      {icon && !loading ? <View>{icon}</View> : null}
    </Pressable>
  );
}
