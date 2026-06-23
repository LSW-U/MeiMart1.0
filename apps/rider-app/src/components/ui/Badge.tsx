import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type BadgeProps = {
  children: ReactNode;
  className?: string;
  textClassName?: string;
};

export function Badge({ children, className = '', textClassName = '' }: BadgeProps) {
  return (
    <View className={`rounded-full bg-[#ffe9e6] px-3 py-1 ${className}`}>
      <Text className={`text-xs font-semibold text-[#720003] ${textClassName}`}>{children}</Text>
    </View>
  );
}
