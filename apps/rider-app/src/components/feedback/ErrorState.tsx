import { Text, View } from 'react-native';

type ErrorStateProps = {
  message: string;
};

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <View className="rounded-3xl border border-[#f7ddd9] bg-white p-5">
      <Text className="font-bold text-[#961813]">Something went wrong</Text>
      <Text className="mt-2 text-sm text-[#59413d]">{message}</Text>
    </View>
  );
}
