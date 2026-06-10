import { Text, View } from 'react-native';

export function OfflineBanner() {
  return (
    <View className="bg-[#961813] px-4 py-2">
      <Text className="text-center text-sm font-semibold text-white">Offline mode</Text>
    </View>
  );
}
