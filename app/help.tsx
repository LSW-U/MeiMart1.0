import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppIcon } from '../src/components/ui';

const topics = [
  {
    title: 'Task flow',
    description: 'Accept new tasks, confirm pickup with receipt photo, navigate, and upload delivery proof.',
  },
  {
    title: 'Wallet and withdrawals',
    description: 'Review daily billing, wallet balance, and request bank or cash pickup withdrawals.',
  },
  {
    title: 'Account safety',
    description: 'Keep your phone number, documents, and vehicle information updated before going on duty.',
  },
];

export default function HelpPage() {
  const router = useRouter();
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(main)/profile');
    }
  };

  return (
    <View className="flex-1 bg-[#fff8f7]">
      <View className="flex-row items-center border-b border-[#f7ddd9] bg-[#fff8f7] px-5 py-4">
        <Pressable className="h-10 w-10 items-center justify-center rounded-full active:bg-[#ffe9e6]" onPress={goBack}>
          <Text className="text-2xl text-[#261816]">‹</Text>
        </Pressable>
        <Text className="ml-2 text-xl font-semibold text-[#261816]">Help Center</Text>
      </View>
      <ScrollView contentContainerClassName="gap-4 px-5 py-6 pb-12">
        <View className="rounded-3xl bg-[#720003] p-6 shadow-sm">
          <AppIcon color="#ffffff" name="help" size={34} />
          <Text className="mt-4 text-2xl font-bold text-white">How can we help?</Text>
          <Text className="mt-2 text-sm leading-6 text-white/80">This demo help center collects the key rider workflows for product acceptance.</Text>
        </View>
        {topics.map((topic) => (
          <View key={topic.title} className="rounded-2xl border border-[#ffe9e6] bg-white p-5 shadow-sm">
            <Text className="text-lg font-bold text-[#261816]">{topic.title}</Text>
            <Text className="mt-2 text-sm leading-6 text-[#59413d]">{topic.description}</Text>
          </View>
        ))}
        <View className="rounded-2xl border border-[#e1bfba] bg-[#fff0ee] p-5">
          <Text className="text-sm font-bold uppercase tracking-wider text-[#720003]">Support hotline</Text>
          <Text className="mt-2 text-xl font-bold text-[#261816]">+670 7700 0000</Text>
          <Text className="mt-1 text-sm text-[#59413d]">Available for pickup, delivery, wallet, and account issues.</Text>
        </View>
      </ScrollView>
    </View>
  );
}
