import { Linking, Platform } from 'react-native';
import { Pressable, Text } from 'react-native';

import type { Coordinates } from '../../types/common';

type NavigationLauncherProps = {
  destination: Coordinates;
  label?: string;
  onError?: (error: Error) => void;
};

export function NavigationLauncher({ destination, label = 'Open navigation', onError }: NavigationLauncherProps) {
  const openNavigation = async () => {
    const { latitude, longitude } = destination;
    const url = Platform.select({
      ios: `maps://app?daddr=${latitude},${longitude}&dirflg=d`,
      android: `google.navigation:q=${latitude},${longitude}&mode=d`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`,
    });

    try {
      const supported = await Linking.canOpenURL(url!);
      if (supported) {
        await Linking.openURL(url!);
      } else {
        const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
        await Linking.openURL(webUrl);
      }
    } catch (e) {
      onError?.(e instanceof Error ? e : new Error(String(e)));
    }
  };

  return (
    <Pressable className="rounded-full bg-[#720003] px-5 py-3" onPress={() => void openNavigation()}>
      <Text className="text-center font-semibold text-white">{label}</Text>
    </Pressable>
  );
}
