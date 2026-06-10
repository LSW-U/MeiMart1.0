import { Text, View } from 'react-native';

type CountdownTimerProps = {
  minutes: number;
  label?: string;
};

export function CountdownTimer({ minutes, label = 'ETA' }: CountdownTimerProps) {
  return (
    <View className="rounded-2xl bg-[#ffe9e6] px-4 py-3">
      <Text className="text-xs font-semibold uppercase text-[#59413d]">{label}</Text>
      <Text className="mt-1 text-xl font-bold text-[#720003]">{minutes} min</Text>
    </View>
  );
}
