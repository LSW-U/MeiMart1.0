import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

type SafeAreaWrapperProps = {
  children: ReactNode;
  className?: string;
};

export function SafeAreaWrapper({ children, className = '' }: SafeAreaWrapperProps) {
  return <SafeAreaView className={`flex-1 bg-surface ${className}`}>{children}</SafeAreaView>;
}
