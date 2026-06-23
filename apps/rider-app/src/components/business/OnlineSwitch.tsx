import { Pressable, Text, View } from 'react-native';

type OnlineSwitchProps = {
  online: boolean;
  onToggle: () => void;
};

export function OnlineSwitch({ online, onToggle }: OnlineSwitchProps) {
  return (
    <Pressable className="flex-row items-center gap-3" onPress={onToggle}>
      <View className={`h-7 w-12 rounded-full p-1 ${online ? 'bg-[#720003]' : 'bg-[#d7c1bd]'}`}>
        <View className={`h-5 w-5 rounded-full bg-white ${online ? 'ml-5' : ''}`} />
      </View>
      <Text className="font-semibold text-[#261816]">{online ? 'Online' : 'Offline'}</Text>
    </Pressable>
  );
}
