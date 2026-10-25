import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

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
  // R-P0-5（UI 走查 20261024）：触控热区透传——小尺寸调用方（如 ErrorState）补足 44px 触达；
  // 缺省 undefined 保持默认行为，既有 30+ 调用方零影响
  hitSlop?: PressableProps['hitSlop'];
  // R-P1-6（走查 20261024 · D1 拍板）：档位 sm=h-11/14px、md=h-14/16px、lg=h-14/18px；
  // 无 variant 维持 h-14、默认字号 12→14（30+ 调用方零布局风险）；
  // outline=描边透明底深字（收编批A 治标 4 处）；调用方 className 后置可覆盖（如 border-warning）
  variant?: 'sm' | 'md' | 'lg' | 'outline';
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
  hitSlop,
  variant,
}: ButtonProps) {
  // B1: 真实禁用——disabled/loading 都阻断 onPress，杜绝弱网连点重复提交
  const inactive = disabled || loading;
  const sizeBox = variant === 'sm' ? 'h-11' : 'h-14';
  const sizeText = variant === 'md' ? 'text-base' : variant === 'lg' ? 'text-lg' : 'text-sm';
  const isOutline = variant === 'outline';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ?? (typeof children === 'string' ? children : undefined)
      }
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={`${sizeBox} flex-row items-center justify-center gap-2 rounded-lg ${isOutline ? 'border border-outline bg-transparent' : 'bg-primary'} active:scale-[0.98] ${className}`}
      disabled={inactive}
      onPress={onPress}
      hitSlop={hitSlop}
      style={[style, { opacity: inactive ? 0.5 : 1 }]}
    >
      {loading ? <ActivityIndicator color={indicatorColor} testID="button-spinner" /> : null}
      <Text
        className={`${sizeText} font-bold tracking-wider ${isOutline ? 'text-on-surface' : 'text-white'} ${textClassName}`}
      >
        {children}
      </Text>
      {icon && !loading ? <View>{icon}</View> : null}
    </Pressable>
  );
}
