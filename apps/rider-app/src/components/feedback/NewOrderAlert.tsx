import { Pressable, Text, View } from 'react-native';

type NewOrderAlertProps = {
  title: string;
  onPress?: () => void;
};

export function NewOrderAlert({ title, onPress }: NewOrderAlertProps) {
  return (
    <Pressable className="rounded-3xl bg-primary p-4" onPress={onPress}>
      <View className="flex-row items-center justify-between">
        <Text className="font-bold text-white">{title}</Text>
        <Text className="text-sm font-semibold text-surface-container">View</Text>
      </View>
    </Pressable>
  );
}
