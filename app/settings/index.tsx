import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { AppIcon } from '../../src/components/ui';
import { useTranslation } from '../../src/i18n/useTranslation';
import { getRiderSettings, updateRiderSettings, type AppLanguage } from '../../src/services/settings';

type SettingsItemProps = {
  icon: 'language' | 'bell' | 'shield' | 'profile' | 'help';
  title: string;
  description: string;
  onPress?: () => void;
  trailing?: 'switch' | 'chevron';
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
};

const languageLabels: Record<AppLanguage, string> = {
  en: 'English',
  tet: 'Tetum',
  pt: 'Português',
  id: 'Bahasa Indonesia',
};

const languages: AppLanguage[] = ['en', 'tet', 'pt', 'id'];

function SettingsItem({ icon, title, description, onPress, trailing = 'chevron', switchValue = false, onSwitchChange }: SettingsItemProps) {
  return (
    <Pressable className="flex-row items-center gap-4 px-5 py-4 active:bg-[#fff0ee]" onPress={onPress}>
      <View className="h-11 w-11 items-center justify-center rounded-full bg-[#ffe9e6]">
        <AppIcon color="#720003" name={icon} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-[#261816]">{title}</Text>
        <Text className="mt-1 text-sm text-[#59413d]">{description}</Text>
      </View>
      {trailing === 'switch' ? <Switch onValueChange={onSwitchChange} value={switchValue} /> : <AppIcon color="#8d706c" name="chevronRight" />}
    </Pressable>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [language, setLanguage] = useState<AppLanguage>('en');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    void getRiderSettings().then((settings) => {
      setLanguage(settings.language);
      setNotificationsEnabled(settings.notificationsEnabled);
    });
  }, []);

  const rotateLanguage = async () => {
    const nextLanguage = languages[(languages.indexOf(language) + 1) % languages.length];
    setLanguage(nextLanguage);
    await updateRiderSettings({ language: nextLanguage });
  };

  const toggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    await updateRiderSettings({ notificationsEnabled: value });
  };

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
        <Text className="ml-2 text-xl font-semibold text-[#261816]">{t('settings.title')}</Text>
      </View>
      <ScrollView contentContainerClassName="gap-5 px-5 py-6 pb-12">
        <View className="rounded-3xl bg-[#720003] p-5 shadow-sm">
          <Text className="text-sm font-bold uppercase tracking-wider text-white/70">Rider Controls</Text>
          <Text className="mt-2 text-2xl font-bold text-white">Keep your account ready for duty</Text>
          <Text className="mt-2 text-sm leading-6 text-white/80">Notification, language, safety, and profile controls are grouped here for acceptance testing.</Text>
        </View>
        <View className="overflow-hidden rounded-3xl border border-[#ffe9e6] bg-white shadow-sm">
          <SettingsItem description={`${languageLabels[language]} active. Tap to cycle language preference.`} icon="language" title="Language" onPress={() => void rotateLanguage()} />
          <View className="mx-5 h-px bg-[#e1bfba]/40" />
          <SettingsItem description={notificationsEnabled ? 'Receive new task, pickup timeout, and wallet updates.' : 'Task, timeout, and wallet notifications are paused.'} icon="bell" switchValue={notificationsEnabled} title="Notifications" trailing="switch" onSwitchChange={(value) => void toggleNotifications(value)} />
          <View className="mx-5 h-px bg-[#e1bfba]/40" />
          <SettingsItem description="Review phone number, identity document, and vehicle verification." icon="shield" title="Account & Safety" onPress={() => router.push('/profile/edit')} />
          <View className="mx-5 h-px bg-[#e1bfba]/40" />
          <SettingsItem description="Edit rider profile and vehicle details." icon="profile" title="Rider Profile" onPress={() => router.push('/profile/edit')} />
          <View className="mx-5 h-px bg-[#e1bfba]/40" />
          <SettingsItem description="Open workflow FAQs and support hotline." icon="help" title="Help Center" onPress={() => router.push('/help')} />
        </View>
      </ScrollView>
    </View>
  );
}
