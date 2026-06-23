import type { ReactNode } from 'react';
import { View } from 'react-native';

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = '' }: CardProps) {
  return <View className={`rounded-lg bg-white p-6 shadow-sm ${className}`}>{children}</View>;
}
