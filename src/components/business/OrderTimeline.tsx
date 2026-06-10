import { Text, View } from 'react-native';

type TimelineStep = {
  title: string;
  subtitle?: string;
};

type OrderTimelineProps = {
  steps: TimelineStep[];
};

export function OrderTimeline({ steps }: OrderTimelineProps) {
  return (
    <View className="gap-4">
      {steps.map((step, index) => (
        <View key={step.title} className="flex-row gap-3">
          <View className="h-7 w-7 items-center justify-center rounded-full bg-[#720003]">
            <Text className="text-xs font-bold text-white">{index + 1}</Text>
          </View>
          <View className="flex-1">
            <Text className="font-bold text-[#261816]">{step.title}</Text>
            {step.subtitle ? <Text className="mt-1 text-sm text-[#59413d]">{step.subtitle}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}
