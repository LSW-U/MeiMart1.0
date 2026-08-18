import { colors } from "../src/theme/colors";
import { ScrollView, Text, View } from 'react-native';

import { AppIcon } from '../src/components/ui';
import { useTranslation } from '../src/i18n/useTranslation';
import { SimplePageHeader } from '../src/components/layout/SimplePageHeader';

export default function PrivacyPage() {
  const { t } = useTranslation();


  return (
    <View className="flex-1 bg-surface">
      <SimplePageHeader backLabel={t('common.back')} title={t('legal.privacy.title')} />
      <ScrollView contentContainerClassName="gap-4 px-5 py-6 pb-12">
        <View className="rounded-3xl bg-primary p-6 shadow-sm">
          <AppIcon color={colors.surface} name="shield" size={34} />
          <Text className="mt-4 text-2xl font-bold text-white">{t('legal.privacy.title')}</Text>
        </View>
        <View className="rounded-2xl border border-surface-container bg-white p-5 shadow-sm">
          <Text className="text-sm leading-6 text-on-surface-variant">{t('legal.privacy.body')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
