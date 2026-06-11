import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppIcon } from '../src/components/ui';
import { useTranslation } from '../src/i18n/useTranslation';
import { isRiderSessionActive } from '../src/services/user';

export default function TermsPage() {
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
        <Text className="ml-2 text-xl font-semibold text-[#261816]">{t('legal.terms.title')}</Text>
      </View>
      <ScrollView contentContainerClassName="gap-4 px-5 py-6 pb-12">
        <View className="rounded-3xl bg-[#720003] p-6 shadow-sm">
          <AppIcon color="#ffffff" name="document" size={34} />
          <Text className="mt-4 text-2xl font-bold text-white">{t('legal.terms.title')}</Text>
        </View>
        <View className="rounded-2xl border border-[#ffe9e6] bg-white p-5 shadow-sm">
          <Text className="text-sm leading-6 text-[#59413d]">{t('legal.terms.body')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
