import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '../../src/i18n/useTranslation';

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View className="flex-1 bg-[#fff8f7]">
      <View className="flex-row items-center border-b border-[#f7ddd9] bg-[#fff8f7] px-5 py-4">
        <Pressable className="h-10 w-10 items-center justify-center rounded-full active:bg-[#ffe9e6]" onPress={() => router.back()}>
          <Text className="text-2xl text-[#261816]">‹</Text>
        </Pressable>
        <Text className="ml-2 text-xl font-semibold text-[#261816]">{t('settings.title')}</Text>
      </View>
    </View>
  );
}
