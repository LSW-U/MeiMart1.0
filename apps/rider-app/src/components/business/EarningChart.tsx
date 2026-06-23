import { Text, View } from 'react-native';

type EarningChartProps = {
  values: number[];
};

export function EarningChart({ values }: EarningChartProps) {
  const maxValue = Math.max(...values, 1);

  return (
    <View className="flex-row items-end gap-2 rounded-3xl bg-white p-4">
      {values.map((value, index) => (
        <View key={`${value}-${index}`} className="flex-1 items-center gap-2">
          <View className="w-full rounded-t-xl bg-[#720003]" style={{ height: 24 + (value / maxValue) * 72 }} />
          <Text className="text-[10px] text-[#59413d]">{index + 1}</Text>
        </View>
      ))}
    </View>
  );
}
