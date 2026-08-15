import { colors } from "../../theme/colors";
import type { ComponentProps, ReactNode } from 'react';
import { Text, TextInput, View } from 'react-native';

type InputProps = ComponentProps<typeof TextInput> & {
  label: string;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  error?: string;
  helperText?: string;
  containerClassName?: string;
};

export function Input({ label, leftSlot, rightSlot, error, helperText, containerClassName = '', className = '', ...props }: InputProps) {
  // B2: 错误态边框 border-error；slot 容器只做布局，内容由调用方传入
  return (
    <View className={`gap-1.5 ${containerClassName}`}>
      <Text className="ml-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">{label}</Text>
      <View className={`min-h-14 flex-row items-center rounded-lg border ${error ? 'border-error' : 'border-outline-variant'} bg-surface`}>
        {leftSlot ? <View className="justify-center pl-4 pr-2">{leftSlot}</View> : null}
        <TextInput
          accessibilityLabel={label}
          className={`flex-1 px-4 py-3 text-base text-on-surface ${className}`}
          placeholderTextColor={colors.outline}
          {...props}
        />
        {rightSlot ? <View className="justify-center pl-2 pr-2">{rightSlot}</View> : null}
      </View>
      {error ? (
        <Text className="ml-1 text-xs text-error">{error}</Text>
      ) : helperText ? (
        <Text className="ml-1 text-xs text-on-surface-variant">{helperText}</Text>
      ) : null}
    </View>
  );
}
