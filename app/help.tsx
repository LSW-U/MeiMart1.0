import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppIcon } from '../src/components/ui';
import { useTranslation } from '../src/i18n/useTranslation';
import { isRiderSessionActive } from '../src/services/user';

const topicKeys = [
  { titleKey: 'help.topic.taskFlow.title', descKey: 'help.topic.taskFlow.description' },
  { titleKey: 'help.topic.wallet.title', descKey: 'help.topic.wallet.description' },
  { titleKey: 'help.topic.accountSafety.title', descKey: 'help.topic.accountSafety.description' },
] as const;

export default function HelpPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const goBack = useCallback(async () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    const active = await isRiderSessionActive();
    router.replace(active ? '/(main)/profile' : '/(auth)/login');
  }, [router]);

  return (
    <View className="flex-1 bg-[#fff8f7]">
      <View className="flex-row items-center border-b border-[#f7ddd9] bg-[#fff8f7] px-5 py-4">
        <Pressable className="h-10 w-10 items-center justify-center rounded-full active:bg-[#ffe9e6]" onPress={() => void goBack()}>
          <Text className="text-2xl text-[#261816]">‹</Text>
        </Pressable>
        <Text className="ml-2 text-xl font-semibold text-[#261816]">{t('help.title')}</Text>
      </View>
      <ScrollView contentContainerClassName="gap-4 px-5 py-6 pb-12">
        <View className="rounded-3xl bg-[#720003] p-6 shadow-sm">
          <AppIcon color="#ffffff" name="help" size={34} />
          <Text className="mt-4 text-2xl font-bold text-white">{t('help.hero.title')}</Text>
          <Text className="mt-2 text-sm leading-6 text-white/80">{t('help.hero.description')}</Text>
        </View>
        {topicKeys.map(({ titleKey, descKey }) => (
          <View key={titleKey} className="rounded-2xl border border-[#ffe9e6] bg-white p-5 shadow-sm">
            <Text className="text-lg font-bold text-[#261816]">{t(titleKey)}</Text>
            <Text className="mt-2 text-sm leading-6 text-[#59413d]">{t(descKey)}</Text>
          </View>
        ))}
        <View className="rounded-2xl border border-[#e1bfba] bg-[#fff0ee] p-5">
          <Text className="text-sm font-bold uppercase tracking-wider text-[#720003]">{t('help.support.eyebrow')}</Text>
          <Text className="mt-2 text-xl font-bold text-[#261816]">+670 7700 0000</Text>
          <Text className="mt-1 text-sm text-[#59413d]">{t('help.support.description')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}