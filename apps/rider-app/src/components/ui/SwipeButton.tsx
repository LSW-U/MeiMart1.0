import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';

type SwipeButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
};

// 原实现用 PanResponder 滑动，但 RN Web 端 responder system 转译不完美导致无法滑动。
// 改为 Pressable 点击按钮（Web + native 一致行为），UI 保留长条 + → 箭头视觉。
export function SwipeButton({ children, disabled = false, onPress }: SwipeButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`h-14 w-full flex-row items-center justify-center rounded-lg ${disabled ? 'bg-[#5d5f5f] opacity-50' : 'bg-[#961813]'}`}
    >
      <Text className="text-base font-bold uppercase tracking-widest text-white">{children}</Text>
      <Text className="ml-2 text-xl text-white/80">→</Text>
    </Pressable>
  );
}
