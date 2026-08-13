import { Text, View } from 'react-native';

type EmptyStateProps = {
  title: string;
  description?: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View className="items-center rounded-3xl bg-white p-6">
      <Text className="text-lg font-bold text-on-surface">{title}</Text>
      {description ? <Text className="mt-2 text-center text-sm text-on-surface-variant">{description}</Text> : null}
    </View>
  );
}
