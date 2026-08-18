import { Text, View } from 'react-native';

type PickupChecklistProps = {
  items: string[];
};

export function PickupChecklist({ items }: PickupChecklistProps) {
  return (
    <View className="gap-3 rounded-3xl bg-surface p-4">
      {items.map((item) => (
        <View key={item} className="flex-row items-center gap-3">
          <View className="h-5 w-5 rounded-full border border-primary" />
          <Text className="flex-1 text-sm text-on-surface">{item}</Text>
        </View>
      ))}
    </View>
  );
}
