import { Text, View } from 'react-native';

type EarningChartProps = {
  values: number[];
};

export function EarningChart({ values }: EarningChartProps) {
  const maxValue = Math.max(...values, 1);

  return (
    <View className="flex-row items-end gap-2 rounded-3xl bg-surface p-4">
      {values.map((value, index) => (
        // D5 批4：key 用 index 而非 value——柱是定长位置槽（周/月序列），值变化应原位
        // 更新而非 remount；value 拼 key 恰好相反（P3-1 审查备注：勿改回 `${value}-${index}`）
        <View key={index} className="flex-1 items-center gap-2">
          <View
            className="w-full rounded-t-xl bg-primary"
            style={{ height: 24 + (value / maxValue) * 72 }}
          />
          <Text className="text-[10px] text-on-surface-variant">{index + 1}</Text>
        </View>
      ))}
    </View>
  );
}
