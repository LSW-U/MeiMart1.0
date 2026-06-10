import { Text, View } from 'react-native';

type ToastProps = {
  message: string;
};

export function Toast({ message }: ToastProps) {
  return (
    <View className="rounded-full bg-[#261816] px-4 py-3">
      <Text className="text-center text-sm font-semibold text-white">{message}</Text>
    </View>
  );
}
