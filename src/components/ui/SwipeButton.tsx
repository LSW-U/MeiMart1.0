import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';

type SwipeButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
};

export function SwipeButton({ children, disabled = false, onPress }: SwipeButtonProps) {
  return (
    <Pressable
      className={`w-full flex-row items-center justify-center gap-3 rounded-lg py-4 ${disabled ? 'bg-[#5d5f5f] opacity-50' : 'bg-[#961813]'}`}
      disabled={disabled}
      onPress={onPress}
    >
      <Text className="text-sm font-bold uppercase tracking-widest text-white">{children}</Text>
      <Text className="text-white">→</Text>
    </Pressable>
  );
}
