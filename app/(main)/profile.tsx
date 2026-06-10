import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import { AppIcon } from '../../src/components/ui';
import { useTranslation } from '../../src/i18n/useTranslation';
import { getRiderProfile, resetRiderSession } from '../../src/services/user';
import type { RiderProfile } from '../../src/types/rider';

type MenuItemProps = {
  icon: 'wallet' | 'settings' | 'help' | 'logout';
  label: string;
  tone?: 'default' | 'danger';
  onPress?: () => void;
};

function MenuItem({ icon, label, tone = 'default', onPress }: MenuItemProps) {
  const danger = tone === 'danger';

  return (
    <Pressable className={`flex-row items-center justify-between p-5 ${danger ? 'active:bg-[#ffdad6]/30' : 'active:bg-[#fff0ee]'}`} onPress={onPress}>
      <View className="flex-row items-center gap-4">
        <View className={`h-10 w-10 items-center justify-center rounded-full ${danger ? 'bg-[#ffdad6]/50' : 'bg-[#ffe9e6]'}`}>
          <AppIcon color={danger ? '#ba1a1a' : '#59413d'} name={icon} />
        </View>
        <Text className={`text-lg font-medium ${danger ? 'text-[#ba1a1a]' : 'text-[#261816]'}`}>{label}</Text>
      </View>
      {!danger ? <Text className="text-[#8d706c]">›</Text> : null}
    </Pressable>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<RiderProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      void getRiderProfile().then(setProfile);
    }, []),
  );

  const logout = async () => {
    await resetRiderSession();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView className="flex-1 bg-[#fff8f7]" contentContainerClassName="pb-12">
      <View className="sticky top-0 z-50 flex-row items-center justify-between bg-[#fff8f7]/90 px-5 py-3">
        <View className="flex-row items-center gap-3">
          <Pressable className="h-10 w-10 items-center justify-center rounded-full active:bg-[#ffe9e6]" onPress={() => router.replace('/(main)/tasks')}>
            <Text className="text-2xl text-[#720003]">‹</Text>
          </Pressable>
          <Text className="text-xl font-bold text-[#261816]">Profile</Text>
        </View>
        <Pressable className="rounded-full p-2" onPress={() => router.push('/profile/edit')}>
          <Text className="font-bold text-[#720003]">EDIT</Text>
        </Pressable>
      </View>

      <View className="items-center gap-4 px-5 pb-2 pt-4">
        <View className="relative items-center">
          <View className="h-24 w-24 rounded-full bg-[#634700] p-[3px]">
            <Image className="h-full w-full rounded-full border-2 border-[#fff8f7]" resizeMode="cover" source={{ uri: profile?.avatarUrl }} />
          </View>
          <View className="absolute -bottom-3 rounded-full border-2 border-[#fff8f7] bg-[#634700] px-3 py-1 shadow-sm">
            <Text className="text-[11px] font-bold uppercase tracking-wider text-[#deb769]">{t('profile.tier')}</Text>
          </View>
        </View>
        <View className="mt-2 items-center">
          <Text className="text-2xl font-bold text-[#261816]">{profile?.name ?? t('profile.name')}</Text>
          <View className="mt-1 flex-row items-center gap-2">
            <Text className="text-sm text-[#59413d]">ID: {profile?.id ?? '8842910'}</Text>
            <View className="h-1 w-1 rounded-full bg-[#e1bfba]" />
            <Text className="text-sm font-medium text-[#463200]">{t('profile.rating')}</Text>
          </View>
        </View>
      </View>

      <View className="mx-5 mb-8 mt-4 overflow-hidden rounded-[24px] border border-[#fde2df] bg-[#fde2df] px-6 py-8 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 items-center">
            <Text className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#59413d]">{t('profile.orders')}</Text>
            <Text className="text-4xl font-medium text-[#720003]">{t('profile.ordersValue')}</Text>
            <Text className="mt-1 text-[9px] font-bold uppercase text-[#8d706c]">{t('profile.today')}</Text>
          </View>
          <View className="h-12 w-px bg-[#e1bfba]" />
          <View className="flex-[1.2] items-center px-2">
            <Text className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#59413d]">{t('profile.earnings')}</Text>
            <Text className="text-4xl font-bold text-[#720003]">¥{t('profile.earningsValue')}</Text>
            <Text className="mt-1 text-[9px] font-bold uppercase text-[#8d706c]">{t('profile.today')}</Text>
          </View>
          <View className="h-12 w-px bg-[#e1bfba]" />
          <View className="flex-1 items-center">
            <Text className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#59413d]">{t('profile.score')}</Text>
            <Text className="text-4xl font-medium text-[#720003]">{t('profile.scoreValue')}</Text>
            <Text className="mt-1 text-[9px] font-bold uppercase text-[#8d706c]">{t('profile.level')}</Text>
          </View>
        </View>
      </View>

      <View className="mx-5 mb-8 flex-row gap-4">
        <Pressable className="flex-1 flex-row items-center gap-4 rounded-2xl border border-[#ffe9e6] bg-white p-5 shadow-sm" onPress={() => router.push('/order/history')}>
          <View className="rounded-xl bg-[#ffe9e6] p-3">
            <AppIcon name="orders" className="text-xl text-[#720003]" />
          </View>
          <Text className="text-[17px] font-semibold text-[#261816]">{t('profile.myOrders')}</Text>
        </Pressable>
        <Pressable className="flex-1 flex-row items-center gap-4 rounded-2xl border border-[#ffe9e6] bg-white p-5 shadow-sm" onPress={() => router.push('/(main)/earnings')}>
          <View className="rounded-xl bg-[#ffe9e6] p-3">
            <AppIcon name="wallet" className="text-xl text-[#720003]" />
          </View>
          <Text className="text-[17px] font-semibold text-[#261816]">{t('profile.myWallet')}</Text>
        </Pressable>
      </View>

      <View className="mx-5 overflow-hidden rounded-[20px] border border-[#ffe9e6] bg-white shadow-sm">
        <MenuItem icon="wallet" label={t('profile.earningsHistory')} onPress={() => router.push('/(main)/earnings')} />
        <View className="mx-5 h-px bg-[#e1bfba]/40" />
        <MenuItem icon="settings" label={t('profile.settings')} onPress={() => router.push('/settings')} />
        <View className="mx-5 h-px bg-[#e1bfba]/40" />
        <MenuItem icon="help" label={t('profile.helpCenter')} onPress={() => router.push('/help')} />
        <View className="mx-5 h-px bg-[#e1bfba]/40" />
        <MenuItem icon="logout" label={t('profile.logout')} tone="danger" onPress={() => void logout()} />
      </View>
    </ScrollView>
  );
}
