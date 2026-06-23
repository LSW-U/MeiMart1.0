import { Text, View } from 'react-native';

type PickupChecklistProps = {
  items: string[];
};

export function PickupChecklist({ items }: PickupChecklistProps) {
  return (
    <View className="gap-3 rounded-3xl bg-white p-4">
      {items.map((item) => (
        <View key={item} className="flex-row items-center gap-3">
          <View className="h-5 w-5 rounded-full border border-[#720003]" />
          <Text className="flex-1 text-sm text-[#261816]">{item}</Text>
        </View>
      ))}
    </View>
  );
}
