import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppIcon } from '../src/components/ui';
import { useTranslation } from '../src/i18n/useTranslation';
import { useGoBack } from '../src/hooks/useGoBack';

const topicKeys = [
  { titleKey: 'help.topic.taskFlow.title', descKey: 'help.topic.taskFlow.description' },
  { titleKey: 'help.topic.wallet.title', descKey: 'help.topic.wallet.description' },
  { titleKey: 'help.topic.accountSafety.title', descKey: 'help.topic.accountSafety.description' },
] as const;

export default function HelpPage() {
  const { t } = useTranslation();

  const goBack = useGoBack('/(main)/profile');

  return (
    <View className="flex-1 bg-surface">
      <View className="flex-row items-center border-b border-surface-variant bg-surface px-5 py-4">
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} className="h-10 w-10 items-center justify-center rounded-full active:bg-surface-container" onPress={() => void goBack()}>
          <Text className="text-2xl text-on-surface">‹</Text>
        </Pressable>
        <Text className="ml-2 text-xl font-semibold text-on-surface">{t('help.title')}</Text>
      </View>
      <ScrollView contentContainerClassName="gap-4 px-5 py-6 pb-12">
        <View className="rounded-3xl bg-primary p-6 shadow-sm">
          <AppIcon color="#ffffff" name="help" size={34} />
          <Text className="mt-4 text-2xl font-bold text-white">{t('help.hero.title')}</Text>
          <Text className="mt-2 text-sm leading-6 text-white/80">{t('help.hero.description')}</Text>
        </View>
        {topicKeys.map(({ titleKey, descKey }) => (
          <View key={titleKey} className="rounded-2xl border border-surface-container bg-white p-5 shadow-sm">
            <Text className="text-lg font-bold text-on-surface">{t(titleKey)}</Text>
            <Text className="mt-2 text-sm leading-6 text-on-surface-variant">{t(descKey)}</Text>
          </View>
        ))}
        <View className="rounded-2xl border border-outline-variant bg-surface-container-low p-5">
          <Text className="text-sm font-bold uppercase tracking-wider text-primary">{t('help.support.eyebrow')}</Text>
          <Text className="mt-2 text-xl font-bold text-on-surface">+670 7700 0000</Text>
          <Text className="mt-1 text-sm text-on-surface-variant">{t('help.support.description')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}