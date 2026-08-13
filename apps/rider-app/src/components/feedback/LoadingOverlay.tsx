import { ActivityIndicator, Text, View } from 'react-native';

type LoadingOverlayProps = {
  label?: string;
};

export function LoadingOverlay({ label = 'Loading' }: LoadingOverlayProps) {
  return (
    <View className="absolute inset-0 items-center justify-center bg-white/80">
      <ActivityIndicator color="#720003" />
      <Text className="mt-3 text-sm font-semibold text-on-surface-variant">{label}</Text>
    </View>
  );
}
