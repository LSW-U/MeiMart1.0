import type { ReactNode } from 'react';
import { View } from 'react-native';

type TabBarProps = {
  children: ReactNode;
};

export function TabBar({ children }: TabBarProps) {
  return <View className="flex-row rounded-full bg-[#ffe9e6] p-1">{children}</View>;
}
