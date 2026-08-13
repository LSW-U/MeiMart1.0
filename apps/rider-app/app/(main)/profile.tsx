import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import { AppIcon } from '../../src/components/ui';
import { ConfirmDialog } from '../../src/components/feedback/ConfirmDialog';
import { useAuth } from '../../src/hooks/useAuth';
import { useTranslation } from '../../src/i18n/useTranslation';
import { useAuthStore } from '../../src/store/useAuthStore';
import { colors } from '../../src/theme/colors';

type MenuItemProps = {
  icon: 'wallet' | 'settings' | 'help' | 'logout';
  label: string;
  tone?: 'default' | 'danger';
  onPress?: () => void;
};

function MenuItem({ icon, label, tone = 'default', onPress }: MenuItemProps) {
  const danger = tone === 'danger';

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} className={`flex-row items-center justify-between p-5 ${danger ? 'active:bg-[#ffdad6]/30' : 'active:bg-surface-container-low'}`} onPress={onPress}>
      <View className="flex-row items-center gap-4">
        <View className={`h-10 w-10 items-center justify-center rounded-full ${danger ? 'bg-[#ffdad6]/50' : 'bg-surface-container'}`}>
          <AppIcon color={danger ? colors.error : colors.textMuted} name={icon} />
        </View>
        <Text className={`text-lg font-medium ${danger ? 'text-error' : 'text-on-surface'}`}>{label}</Text>
      </View>
      {!danger ? <Text className="text-outline">›</Text> : null}
    </Pressable>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const rider = useAuthStore((s) => s.rider);
  const { logout } = useAuth();
  const hydrate = useAuthStore((s) => s.hydrate);

  const [logoutVisible, setLogoutVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void hydrate();
    }, [hydrate]),
  );

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="pb-12">
      <View className="sticky top-0 z-50 flex-row items-center justify-between bg-surface/90 px-5 py-3">
        <View className="flex-row items-center gap-3">
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} className="h-10 w-10 items-center justify-center rounded-full active:bg-surface-container" onPress={() => router.replace('/(main)/tasks')}>
            <Text className="text-2xl text-primary">‹</Text>
          </Pressable>
          <Text className="text-xl font-bold text-on-surface">{t('profile.title')}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('profile.edit')} className="rounded-full p-2" onPress={() => router.push('/profile/edit')}>
          <Text className="font-bold text-primary">{t('profile.edit')}</Text>
        </Pressable>
      </View>

      <View className="items-center gap-4 px-5 pb-2 pt-4">
        <View className="relative items-center">
          <View className="h-24 w-24 rounded-full bg-tertiary-container p-[3px]">
            <Image className="h-full w-full rounded-full border-2 border-surface" resizeMode="cover" source={{ uri: rider?.avatarUrl }} />
          </View>
          <View className="absolute -bottom-3 rounded-full border-2 border-surface bg-tertiary-container px-3 py-1 shadow-sm">
            <Text className="text-[11px] font-bold uppercase tracking-wider text-[#deb769]">{t('profile.tier')}</Text>
          </View>
        </View>
        <View className="mt-2 items-center">
          <Text className="text-2xl font-bold text-on-surface">{rider?.name ?? t('profile.name')}</Text>
          <View className="mt-1 flex-row items-center gap-2">
            <Text className="text-sm text-on-surface-variant">{t('profile.riderId', { id: rider?.id ?? '—' })}</Text>
            <View className="h-1 w-1 rounded-full bg-outline-variant" />
            <Text className="text-sm font-medium text-tertiary">{t('profile.rating')}</Text>
          </View>
        </View>
      </View>

      <View className="mx-5 mb-8 mt-4 overflow-hidden rounded-[24px] border border-surface-container-high bg-surface-container-high px-6 py-8 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 items-center">
            <Text className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('profile.orders')}</Text>
            <Text className="text-4xl font-medium text-primary">{t('profile.ordersValue')}</Text>
            <Text className="mt-1 text-[9px] font-bold uppercase text-outline">{t('profile.today')}</Text>
          </View>
          <View className="h-12 w-px bg-outline-variant" />
          <View className="flex-[1.2] items-center px-2">
            <Text className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('profile.earnings')}</Text>
            <Text className="text-4xl font-bold text-primary">{t('common.currency')}{t('profile.earningsValue')}</Text>
            <Text className="mt-1 text-[9px] font-bold uppercase text-outline">{t('profile.today')}</Text>
          </View>
          <View className="h-12 w-px bg-outline-variant" />
          <View className="flex-1 items-center">
            <Text className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('profile.score')}</Text>
            <Text className="text-4xl font-medium text-primary">{t('profile.scoreValue')}</Text>
            <Text className="mt-1 text-[9px] font-bold uppercase text-outline">{t('profile.level')}</Text>
          </View>
        </View>
      </View>

      <View className="mx-5 mb-8 flex-row gap-4">
        <Pressable accessibilityRole="button" accessibilityLabel={t('profile.myOrders')} className="flex-1 flex-row items-center gap-4 rounded-2xl border border-surface-container bg-white p-5 shadow-sm" onPress={() => router.push('/order/history')}>
          <View className="rounded-xl bg-surface-container p-3">
            <AppIcon name="orders" className="text-xl text-primary" />
          </View>
          <Text className="text-[17px] font-semibold text-on-surface">{t('profile.myOrders')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('profile.myWallet')} className="flex-1 flex-row items-center gap-4 rounded-2xl border border-surface-container bg-white p-5 shadow-sm" onPress={() => router.push('/(main)/earnings')}>
          <View className="rounded-xl bg-surface-container p-3">
            <AppIcon name="wallet" className="text-xl text-primary" />
          </View>
          <Text className="text-[17px] font-semibold text-on-surface">{t('profile.myWallet')}</Text>
        </Pressable>
      </View>

      <View className="mx-5 overflow-hidden rounded-[20px] border border-surface-container bg-white shadow-sm">
        <MenuItem icon="wallet" label={t('profile.earningsHistory')} onPress={() => router.push('/(main)/earnings')} />
        <View className="mx-5 h-px bg-outline-variant/40" />
        <MenuItem icon="settings" label={t('profile.settings')} onPress={() => router.push('/settings')} />
        <View className="mx-5 h-px bg-outline-variant/40" />
        <MenuItem icon="help" label={t('profile.helpCenter')} onPress={() => router.push('/help')} />
        <View className="mx-5 h-px bg-outline-variant/40" />
        <MenuItem icon="logout" label={t('profile.logout')} tone="danger" onPress={() => setLogoutVisible(true)} />
      </View>

      <ConfirmDialog
        cancelLabel={t('duty.confirm.cancel')}
        message={t('profile.logoutConfirmMessage')}
        okLabel={t('profile.logout')}
        title={t('profile.logoutConfirmTitle')}
        visible={logoutVisible}
        onCancel={() => setLogoutVisible(false)}
        onOk={() => { setLogoutVisible(false); void handleLogout(); }}
      />
    </ScrollView>
  );
}
