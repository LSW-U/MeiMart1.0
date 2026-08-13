import type { ReactNode } from 'react';
import { View } from 'react-native';

type BottomNavProps = {
  children: ReactNode;
};

export function BottomNav({ children }: BottomNavProps) {
  return <View className="border-t border-surface-variant bg-surface px-4 py-3">{children}</View>;
}
