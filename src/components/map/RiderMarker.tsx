import { View } from 'react-native';

import { AppIcon } from '../ui';

export function RiderMarker() {
  return (
    <View className="h-9 w-9 items-center justify-center rounded-full bg-[#261816]">
      <AppIcon name="rider" className="text-xs font-bold text-white" />
    </View>
  );
}
