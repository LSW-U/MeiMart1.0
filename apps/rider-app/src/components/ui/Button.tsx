import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

type ButtonProps = {
  children: ReactNode;
  className?: string;
  textClassName?: string;
  icon?: ReactNode;
  onPress?: () => void;
};

export function Button({ children, className = '', textClassName = '', icon, onPress }: ButtonProps) {
  return (
    <Pressable
      className={`h-14 flex-row items-center justify-center gap-2 rounded-lg bg-[#720003] active:scale-[0.98] ${className}`}
      onPress={onPress}
    >
      <Text className={`text-xs font-bold tracking-wider text-white ${textClassName}`}>{children}</Text>
      {icon ? <View>{icon}</View> : null}
    </Pressable>
  );
}
