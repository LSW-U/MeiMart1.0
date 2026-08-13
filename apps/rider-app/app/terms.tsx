import { colors } from "../src/theme/colors";
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppIcon } from '../src/components/ui';
import { useTranslation } from '../src/i18n/useTranslation';
import { useGoBack } from '../src/hooks/useGoBack';

export default function TermsPage() {
  const { t } = useTranslation();

  const goBack = useGoBack('/(main)/profile');

  return (
    <View className="flex-1 bg-surface">
      <View className="flex-row items-center border-b border-surface-variant bg-surface px-5 py-4">
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} className="h-10 w-10 items-center justify-center rounded-full active:bg-surface-container" onPress={() => void goBack()}>
          <Text className="text-2xl text-on-surface">‹</Text>
        </Pressable>
        <Text className="ml-2 text-xl font-semibold text-on-surface">{t('legal.terms.title')}</Text>
      </View>
      <ScrollView contentContainerClassName="gap-4 px-5 py-6 pb-12">
        <View className="rounded-3xl bg-primary p-6 shadow-sm">
          <AppIcon color={colors.surface} name="document" size={34} />
          <Text className="mt-4 text-2xl font-bold text-white">{t('legal.terms.title')}</Text>
        </View>
        <View className="rounded-2xl border border-surface-container bg-white p-5 shadow-sm">
          <Text className="text-sm leading-6 text-on-surface-variant">{t('legal.terms.body')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
