import { Text, View } from 'react-native';

import { useNetwork } from '../../hooks/useNetwork';

export function OfflineBanner() {
  const { isOffline } = useNetwork();

  if (!isOffline) return null;

  return (
    <View className="bg-[#961813] px-4 py-2">
      <Text className="text-center text-sm font-semibold text-white">Offline mode</Text>
    </View>
  );
}
