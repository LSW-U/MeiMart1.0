import { useMemo, useState } from 'react';
import { colors } from '../../src/theme/colors';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { AppIcon, Skeleton } from '../../src/components/ui';
import { ConfirmDialog } from '../../src/components/feedback/ConfirmDialog';
import { showToast } from '../../src/components/feedback/Toast';
import { SimplePageHeader } from '../../src/components/layout/SimplePageHeader';
import { useTranslation } from '../../src/i18n/useTranslation';
import { useRiderSettings, useUpdateRiderSettings } from '../../src/services/queries/useSettings';
import { useDepositStatus } from '../../src/services/queries/useDeposit';
import { formatCurrency } from '../../src/utils/format';
import { getLanguageOptions, type AppLanguage } from '../../src/services/settings';

type SettingsItemProps = {
  icon: 'language' | 'deposit' | 'bell' | 'shield' | 'help';
  title: string;
  description: string;
  onPress?: () => void;
  trailing?: 'switch' | 'chevron';
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  disabled?: boolean;
};

const enabledLanguageOptions = getLanguageOptions();
const allLanguageOptions = getLanguageOptions({ includeUpcoming: true });
const languageLabels = Object.fromEntries(
  allLanguageOptions.map((option) => [option.code, option.nativeLabel]),
) as Record<AppLanguage, string>;
const languages = enabledLanguageOptions.map((option) => option.code);

function SettingsItem({
  icon,
  title,
  description,
  onPress,
  trailing = 'chevron',
  switchValue = false,
  onSwitchChange,
  disabled = false,
}: SettingsItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={disabled ? { disabled: true } : undefined}
      className={`flex-row items-center gap-4 px-5 py-4 ${disabled ? 'opacity-60' : 'active:bg-surface-container-low'}`}
      disabled={disabled}
      onPress={onPress}
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-surface-container">
        <AppIcon color={colors.primary} name={icon} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-on-surface">{title}</Text>
        <Text className="mt-1 text-sm text-on-surface-variant">{description}</Text>
      </View>
      {trailing === 'switch' ? (
        <Switch
          accessibilityRole="switch"
          accessibilityLabel={title}
          accessibilityState={{ checked: switchValue }}
          disabled={disabled}
          onValueChange={onSwitchChange}
          value={switchValue}
        />
      ) : (
        <AppIcon color={colors.outline} name="chevronRight" />
      )}
    </Pressable>
  );
}

// P3-① 闪中文本页缓解：loading 期不渲染中文实体文案，改用骨架条占位
function SettingsItemSkeleton({
  icon,
  trailing,
}: {
  icon: 'language' | 'deposit' | 'bell' | 'shield' | 'help';
  trailing?: 'switch' | 'chevron';
}) {
  return (
    <View className="flex-row items-center gap-4 px-5 py-4">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-surface-container">
        <AppIcon color={colors.primary} name={icon} />
      </View>
      <View className="flex-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-3 w-40" />
      </View>
      {trailing === 'switch' ? (
        <View className="h-7 w-12 rounded-full bg-surface-container" />
      ) : null}
    </View>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: settings, isLoading, isError, refetch } = useRiderSettings();
  const updateSettings = useUpdateRiderSettings();
  const locale: AppLanguage = settings?.language ?? 'zh';
  // 批 G：保证金状态（登录态 gating + 60s staleTime，见 useDeposit）
  const depositQuery = useDepositStatus();
  const notificationsEnabled = settings?.notificationsEnabled ?? true;
  const [confirmVisible, setConfirmVisible] = useState(false);

  const rotateLanguage = async () => {
    // P3-审查④ isPending 防护：连点「语言」会并发 mutateAsync（乐观更新 onMutate 多次 setQueryData + onError 多次回滚竞态），前置守卫阻断
    if (updateSettings.isPending) return;
    const index = languages.indexOf(locale);
    const nextLanguage =
      languages[(index + 1 + languages.length) % languages.length] ?? languages[0];
    try {
      await updateSettings.mutateAsync({ language: nextLanguage });
    } catch {
      // P3-③ 失败反馈：onError 已回滚 cache（UI 自动回退），此处仅提示用户
      showToast(t('settings.error.saveFailed'), 'error');
    }
  };

  const toggleNotifications = async (value: boolean) => {
    if (!value) {
      // P3-② Alert.alert → 项目 ConfirmDialog（tone='danger'，ok 走 bg-error），与 tasks/login 同款视觉
      setConfirmVisible(true);
      return;
    }
    try {
      await updateSettings.mutateAsync({ notificationsEnabled: true });
    } catch {
      showToast(t('settings.error.saveFailed'), 'error');
    }
  };

  const confirmDisableNotifications = async () => {
    setConfirmVisible(false);
    try {
      await updateSettings.mutateAsync({ notificationsEnabled: false });
    } catch {
      showToast(t('settings.error.saveFailed'), 'error');
    }
  };

  const languageDescription = `${languageLabels[locale] ?? languageLabels[languages[0]]} ${t('settings.language.activeSuffix')} ${t('settings.language.cycleHint')}`;

  // 批 G：保证金状态徽章文案（四态：未缴/待确认 $X/已缴 $X 上限 $Y）
  const depositDescription = useMemo(() => {
    const currency = t('common.currency');
    if (depositQuery.data) {
      const { depositAmount, tier, recentRequests } = depositQuery.data;
      const pending = recentRequests.find((r) => r.status === 'PENDING');
      if (pending)
        return t('settings.deposit.statusPending', {
          amount: formatCurrency(pending.requestedAmount / 100, currency, { decimals: 0 }),
        });
      if (depositAmount > 0) {
        const limit = tier?.maxOrderAmount;
        return t('settings.deposit.statusPaid', {
          amount: formatCurrency(depositAmount / 100, currency, { decimals: 0 }),
          limit:
            limit == null
              ? t('settings.deposit.limitUnlimited')
              : formatCurrency(limit / 100, currency, { decimals: 0 }),
        });
      }
    }
    return t('settings.deposit.statusNone');
  }, [depositQuery.data, t]);

  return (
    <View className="flex-1 bg-background">
      <SimplePageHeader backLabel={t('common.back')} title={t('settings.title')} />
      <ScrollView contentContainerClassName="gap-5 px-5 py-6 pb-12">
        {isError ? (
          // P3-⑤ error 态：Hero 显失败 + 重试，Items 不渲染
          <View className="items-center rounded-3xl bg-primary p-6 shadow-sm">
            <Text className="text-2xl font-bold text-white">{t('settings.loadFailed')}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('settings.retry')}
              className="mt-4 rounded-full bg-white px-6 py-2"
              onPress={() => void refetch()}
            >
              <Text className="text-base font-semibold text-primary">{t('settings.retry')}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="rounded-3xl bg-primary p-5 shadow-sm">
              {isLoading ? (
                <>
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-2 h-7 w-48" />
                  <Skeleton className="mt-2 h-4 w-full" />
                </>
              ) : (
                <>
                  <Text className="text-sm font-bold uppercase tracking-wider text-white/70">
                    {t('settings.hero.eyebrow')}
                  </Text>
                  <Text className="mt-2 text-2xl font-bold text-white">
                    {t('settings.hero.title')}
                  </Text>
                  <Text className="mt-2 text-sm leading-6 text-white/80">
                    {t('settings.hero.description')}
                  </Text>
                </>
              )}
            </View>
            <View className="overflow-hidden rounded-3xl border border-surface-container bg-surface shadow-sm">
              {isLoading ? (
                <>
                  <SettingsItemSkeleton icon="language" />
                  <View className="mx-5 h-px bg-outline-variant/40" />
                  <SettingsItemSkeleton icon="bell" trailing="switch" />
                  <View className="mx-5 h-px bg-outline-variant/40" />
                  <SettingsItemSkeleton icon="shield" />
                  <View className="mx-5 h-px bg-outline-variant/40" />
                  <SettingsItemSkeleton icon="help" />
                </>
              ) : (
                <>
                  <SettingsItem
                    description={languageDescription}
                    icon="language"
                    title={t('settings.language.title')}
                    onPress={() => void rotateLanguage()}
                  />
                  <View className="mx-5 h-px bg-outline-variant/40" />
                  {/* 批 G（2026-09-03）：保证金项（HTML 6.1，拍板 ① 语言↔通知之间）——状态徽章四态 */}
                  <SettingsItem
                    description={depositDescription}
                    icon="deposit"
                    title={t('settings.deposit.title')}
                    onPress={() => router.push('/settings/deposit')}
                  />
                  <View className="mx-5 h-px bg-outline-variant/40" />
                  <SettingsItem
                    description={
                      notificationsEnabled
                        ? t('settings.notifications.descriptionOn')
                        : t('settings.notifications.descriptionOff')
                    }
                    icon="bell"
                    switchValue={notificationsEnabled}
                    title={t('settings.notifications.title')}
                    trailing="switch"
                    onSwitchChange={(value) => void toggleNotifications(value)}
                  />
                  <View className="mx-5 h-px bg-outline-variant/40" />
                  <SettingsItem
                    description={t('settings.accountSafety.description')}
                    icon="shield"
                    title={t('settings.accountSafety.title')}
                    onPress={() => router.push('/profile/edit')}
                  />
                  <View className="mx-5 h-px bg-outline-variant/40" />
                  <SettingsItem
                    description={t('settings.helpCenter.description')}
                    icon="help"
                    title={t('settings.helpCenter.title')}
                    onPress={() => router.push('/help')}
                  />
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <ConfirmDialog
        cancelLabel={t('settings.notifications.disableConfirm.cancel')}
        message={t('settings.notifications.disableConfirm.message')}
        okLabel={t('settings.notifications.disableConfirm.ok')}
        title={t('settings.notifications.disableConfirm.title')}
        tone="danger"
        visible={confirmVisible}
        onCancel={() => setConfirmVisible(false)}
        onOk={() => void confirmDisableNotifications()}
      />
    </View>
  );
}
