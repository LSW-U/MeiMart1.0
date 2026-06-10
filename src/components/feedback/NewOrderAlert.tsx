import { Pressable, Text, View } from 'react-native';

type NewOrderAlertProps = {
  title: string;
  onPress?: () => void;
};

export function NewOrderAlert({ title, onPress }: NewOrderAlertProps) {
  return (
    <Pressable className="rounded-3xl bg-[#720003] p-4" onPress={onPress}>
      <View className="flex-row items-center justify-between">
        <Text className="font-bold text-white">{title}</Text>
        <Text className="text-sm font-semibold text-[#ffe9e6]">View</Text>
      </View>
    </Pressable>
  );
}
