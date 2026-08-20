import { colors } from "../../src/theme/colors";
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { AppIcon } from '../../src/components/ui';
import { SimplePageHeader } from '../../src/components/layout/SimplePageHeader';
import { useTranslation } from '../../src/i18n/useTranslation';
import { useRiderSettings, useUpdateRiderSettings } from '../../src/services/queries/useSettings';
import { getLanguageOptions, type AppLanguage } from '../../src/services/settings';

type SettingsItemProps = {
  icon: 'language' | 'bell' | 'shield' | 'profile' | 'help';
  title: string;
  description: string;
  onPress?: () => void;
  trailing?: 'switch' | 'chevron';
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
};

const enabledLanguageOptions = getLanguageOptions();
const allLanguageOptions = getLanguageOptions({ includeUpcoming: true });
const languageLabels = Object.fromEntries(allLanguageOptions.map((option) => [option.code, option.nativeLabel])) as Record<AppLanguage, string>;
const languages = enabledLanguageOptions.map((option) => option.code);

function SettingsItem({ icon, title, description, onPress, trailing = 'chevron', switchValue = false, onSwitchChange }: SettingsItemProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} className="flex-row items-center gap-4 px-5 py-4 active:bg-surface-container-low" onPress={onPress}>
      <View className="h-11 w-11 items-center justify-center rounded-full bg-surface-container">
        <AppIcon color={colors.primary} name={icon} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-on-surface">{title}</Text>
        <Text className="mt-1 text-sm text-on-surface-variant">{description}</Text>
      </View>
      {trailing === 'switch' ? <Switch accessibilityRole="switch" accessibilityLabel={title} accessibilityState={{ checked: switchValue }} onValueChange={onSwitchChange} value={switchValue} /> : <AppIcon color={colors.outline} name="chevronRight" />}
    </Pressable>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: settings } = useRiderSettings();
  const updateSettings = useUpdateRiderSettings();
  const locale: AppLanguage = settings?.language ?? 'zh';
  const notificationsEnabled = settings?.notificationsEnabled ?? true;

  const rotateLanguage = async () => {
    const index = languages.indexOf(locale);
    const nextLanguage = languages[(index + 1 + languages.length) % languages.length] ?? languages[0];
    await updateSettings.mutateAsync({ language: nextLanguage });
  };

  const toggleNotifications = async (value: boolean) => {
    if (!value) {
      Alert.alert(
        t('settings.notifications.disableConfirm.title'),
        t('settings.notifications.disableConfirm.message'),
        [
          { text: t('settings.notifications.disableConfirm.cancel'), style: 'cancel' },
          {
            text: t('settings.notifications.disableConfirm.ok'),
            style: 'destructive',
            onPress: () => void updateSettings.mutateAsync({ notificationsEnabled: false }),
          },
        ],
      );
      return;
    }
    await updateSettings.mutateAsync({ notificationsEnabled: true });
  };


  const languageDescription = `${languageLabels[locale] ?? languageLabels[languages[0]]} ${t('settings.language.activeSuffix')} ${t('settings.language.cycleHint')}`;

  return (
    <View className="flex-1 bg-background">
      <SimplePageHeader backLabel={t('common.back')} title={t('settings.title')} />
      <ScrollView contentContainerClassName="gap-5 px-5 py-6 pb-12">
        <View className="rounded-3xl bg-primary p-5 shadow-sm">
          <Text className="text-sm font-bold uppercase tracking-wider text-white/70">{t('settings.hero.eyebrow')}</Text>
          <Text className="mt-2 text-2xl font-bold text-white">{t('settings.hero.title')}</Text>
          <Text className="mt-2 text-sm leading-6 text-white/80">{t('settings.hero.description')}</Text>
        </View>
        <View className="overflow-hidden rounded-3xl border border-surface-container bg-surface shadow-sm">
          <SettingsItem description={languageDescription} icon="language" title={t('settings.language.title')} onPress={() => void rotateLanguage()} />
          <View className="mx-5 h-px bg-outline-variant/40" />
          <SettingsItem description={notificationsEnabled ? t('settings.notifications.descriptionOn') : t('settings.notifications.descriptionOff')} icon="bell" switchValue={notificationsEnabled} title={t('settings.notifications.title')} trailing="switch" onSwitchChange={(value) => void toggleNotifications(value)} />
          <View className="mx-5 h-px bg-outline-variant/40" />
          <SettingsItem description={t('settings.accountSafety.description')} icon="shield" title={t('settings.accountSafety.title')} onPress={() => router.push('/profile/edit')} />
          <View className="mx-5 h-px bg-outline-variant/40" />
          <SettingsItem description={t('settings.riderProfile.description')} icon="profile" title={t('settings.riderProfile.title')} onPress={() => router.push('/profile/edit')} />
          <View className="mx-5 h-px bg-outline-variant/40" />
          <SettingsItem description={t('settings.helpCenter.description')} icon="help" title={t('settings.helpCenter.title')} onPress={() => router.push('/help')} />
        </View>
      </ScrollView>
    </View>
  );
}
