import type { ComponentProps } from 'react';
import { Text, TextInput, View } from 'react-native';

type InputProps = ComponentProps<typeof TextInput> & {
  label: string;
  leftSlot?: string;
  containerClassName?: string;
};

export function Input({ label, leftSlot, containerClassName = '', className = '', ...props }: InputProps) {
  return (
    <View className={`gap-1.5 ${containerClassName}`}>
      <Text className="ml-1 text-xs font-bold uppercase tracking-wider text-[#59413d]">{label}</Text>
      <View className="min-h-14 flex-row items-center rounded-lg border border-[#e1bfba] bg-white">
        {leftSlot ? <Text className="px-4 text-base text-[#59413d]">{leftSlot}</Text> : null}
        <TextInput
          className={`flex-1 px-4 py-3 text-base text-[#261816] ${className}`}
          placeholderTextColor="#8d706c"
          {...props}
        />
      </View>
    </View>
  );
}
