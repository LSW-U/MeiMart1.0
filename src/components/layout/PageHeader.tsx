import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

type PageHeaderProps = {
  title: string;
};

export function PageHeader({ title }: PageHeaderProps) {
  const router = useRouter();
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(main)/profile');
    }
  };

  return (
    <View className="h-16 flex-row items-center justify-between border-b border-[#ffe9e6] bg-[#fff8f7]/90 px-5">
      <View className="flex-row items-center gap-3">
        <Pressable className="rounded-full p-2 active:bg-[#ffe9e6]" onPress={goBack}>
          <Text className="text-2xl text-[#720003]">‹</Text>
        </Pressable>
        <Text className="text-xl font-semibold text-[#720003]">{title}</Text>
      </View>
      <View className="w-10" />
    </View>
  );
}
