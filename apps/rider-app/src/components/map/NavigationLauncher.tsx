import { Linking, Platform, Pressable, Text } from 'react-native';

import type { Coordinates } from '../../types/common';

type NavigationLauncherProps = {
  destination: Coordinates;
  /** C-P2-9: 可见文案兼 a11y label（调用方传 t() 文案；移除原英文默认 'Open navigation'——当前无调用方，勿造英文兜底） */
  label?: string;
  onError?: (error: Error) => void;
};

export function NavigationLauncher({ destination, label, onError }: NavigationLauncherProps) {
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className="rounded-full bg-primary px-5 py-3"
      onPress={() => void openNavigation()}
    >
      <Text className="text-center font-semibold text-white">{label}</Text>
    </Pressable>
  );
}
