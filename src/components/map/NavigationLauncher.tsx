import { Pressable, Text } from 'react-native';

type NavigationLauncherProps = {
  label?: string;
  onLaunch?: () => void;
};

export function NavigationLauncher({ label = 'Open navigation', onLaunch }: NavigationLauncherProps) {
  return (
    <Pressable className="rounded-full bg-[#720003] px-5 py-3" onPress={onLaunch}>
      <Text className="text-center font-semibold text-white">{label}</Text>
    </Pressable>
  );
}
