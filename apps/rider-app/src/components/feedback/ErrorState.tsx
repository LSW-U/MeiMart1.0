import { Text, View } from 'react-native';

type ErrorStateProps = {
  message: string;
};

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <View className="rounded-3xl border border-surface-variant bg-white p-5">
      <Text className="font-bold text-primary-container">Something went wrong</Text>
      <Text className="mt-2 text-sm text-on-surface-variant">{message}</Text>
    </View>
  );
}
