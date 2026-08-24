import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors } from '../src/theme/colors';
import { AppIcon } from '../src/components/ui';
import { showToast } from '../src/components/feedback/Toast';
import { SimplePageHeader } from '../src/components/layout/SimplePageHeader';
import { useTranslation } from '../src/i18n/useTranslation';

const topicKeys = [
  { titleKey: 'help.topic.taskFlow.title', descKey: 'help.topic.taskFlow.description' },
  { titleKey: 'help.topic.wallet.title', descKey: 'help.topic.wallet.description' },
  { titleKey: 'help.topic.accountSafety.title', descKey: 'help.topic.accountSafety.description' },
] as const;

const legalEntries = [
  { titleKey: 'legal.terms.title', icon: 'document', href: '/terms' },
  { titleKey: 'legal.privacy.title', icon: 'shield', href: '/privacy' },
] as const;

export default function HelpPage() {
  const router = useRouter();
  const { t } = useTranslation();

  // P5-① 客服号码走 i18n + 空值兜底（id/pt/tet phone 维持补值，eyebrow/description/phoneLabel 空串走 en fallback）
  const phone = t('help.support.phone');
  const phoneFallback = phone || '+670 7700 0000';
  // P5-① 拨号失败 catch → showToast（项目无 Toast.show 静态方法，范式见 navigate.tsx:96 / sign.tsx:109）
  const handleDial = async () => {
    try {
      await Linking.openURL(`tel:${phoneFallback}`);
    } catch {
      showToast(t('help.support.dialFailed'), 'error');
    }
  };

  return (
    <View className="flex-1 bg-background">
      <SimplePageHeader backLabel={t('common.back')} title={t('help.title')} />
      <ScrollView contentContainerClassName="gap-4 px-5 py-6 pb-12">
        <View className="rounded-3xl bg-primary p-6 shadow-sm">
          <AppIcon color={colors.surface} name="help" size={34} />
          <Text className="mt-4 text-2xl font-bold text-white">{t('help.hero.title')}</Text>
          <Text className="mt-2 text-sm leading-6 text-white/80">{t('help.hero.description')}</Text>
        </View>
        {topicKeys.map(({ titleKey, descKey }) => (
          <View key={titleKey} className="rounded-2xl border border-surface-container bg-surface p-5 shadow-sm">
            <Text className="text-lg font-bold text-on-surface">{t(titleKey)}</Text>
            <Text className="mt-2 text-sm leading-6 text-on-surface-variant">{t(descKey)}</Text>
          </View>
        ))}
        {/* P5-① 客服热线卡：号码可拨号（Pressable + Linking.openURL('tel:...')）+ 空值兜底 */}
        <View className="rounded-2xl border border-outline-variant bg-surface-container-low p-5">
          <Text className="text-sm font-bold uppercase tracking-wider text-primary">{t('help.support.eyebrow')}</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t('help.support.phoneLabel')}
            className="mt-2 flex-row items-center gap-2 active:opacity-60"
            onPress={() => void handleDial()}
          >
            <AppIcon color={colors.primary} name="phone" size={20} />
            <Text className="text-xl font-bold text-primary">{phoneFallback}</Text>
          </Pressable>
          <Text className="mt-1 text-sm text-on-surface-variant">{t('help.support.description')}</Text>
        </View>
        {/* P5-② 在线客服入口（Q1=A 占位路由 /help/chat，后端 IM 待补） */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('help.support.onlineService')}
          className="flex-row items-center gap-4 rounded-2xl border border-surface-container bg-surface p-5 active:bg-surface-container-low"
          onPress={() => router.push('/help/chat')}
        >
          <View className="h-11 w-11 items-center justify-center rounded-full bg-surface-container">
            <AppIcon color={colors.primary} name="chat" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-on-surface">{t('help.support.onlineService')}</Text>
            <Text className="mt-1 text-sm text-on-surface-variant">{t('help.support.onlineServiceDesc')}</Text>
          </View>
          <AppIcon color={colors.outline} name="chevronRight" />
        </Pressable>
        {/* P5-④ 法律文件 section（登录后可达 terms/privacy） */}
        <View className="gap-2">
          {legalEntries.map(({ titleKey, icon, href }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(titleKey)}
              key={titleKey}
              className="flex-row items-center gap-4 rounded-2xl border border-surface-container bg-surface p-5 active:bg-surface-container-low"
              onPress={() => router.push(href)}
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-surface-container">
                <AppIcon color={colors.primary} name={icon} />
              </View>
              <Text className="flex-1 text-base font-bold text-on-surface">{t(titleKey)}</Text>
              <AppIcon color={colors.outline} name="chevronRight" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
