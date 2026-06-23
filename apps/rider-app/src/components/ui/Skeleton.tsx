import { View } from 'react-native';

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = '' }: SkeletonProps) {
  return <View className={`rounded-2xl bg-[#f7ddd9] ${className}`} />;
}
