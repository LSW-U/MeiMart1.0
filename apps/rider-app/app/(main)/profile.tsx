import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import { AppIcon } from '../../src/components/ui';
import { ConfirmDialog } from '../../src/components/feedback/ConfirmDialog';
import { SimplePageHeader } from '../../src/components/layout/SimplePageHeader';
import { useAuth } from '../../src/hooks/useAuth';
import { useTranslation } from '../../src/i18n/useTranslation';
import { useAuthStore } from '../../src/store/useAuthStore';
import { colors } from '../../src/theme/colors';
import { useOrderTodayStats } from '../../src/services/queries/useOrder';
import { formatCurrency } from '../../src/utils/format';

type MenuItemProps = {
  icon: 'wallet' | 'settings' | 'help' | 'logout';
  label: string;
  tone?: 'default' | 'danger';
  onPress?: () => void;
};

function MenuItem({ icon, label, tone = 'default', onPress }: MenuItemProps) {
  const danger = tone === 'danger';

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} className={`flex-row items-center justify-between p-5 ${danger ? 'active:bg-danger-soft/30' : 'active:bg-surface-container-low'}`} onPress={onPress}>
      <View className="flex-row items-center gap-4">
        <View className={`h-10 w-10 items-center justify-center rounded-full ${danger ? 'bg-danger-soft/50' : 'bg-surface-container'}`}>
          <AppIcon color={danger ? colors.error : colors.textMuted} name={icon} />
        </View>
        <Text className={`text-lg font-medium ${danger ? 'text-error' : 'text-on-surface'}`}>{label}</Text>
      </View>
      {!danger ? <Text className="text-outline">›</Text> : null}
    </Pressable>
  );
}

/** P1 §3.1⑥ + 拍板 ⑥：统计区三态——loading/error/null 显「—」，data 正常渲染。
 *  与 E3 history 底栏同策略（单行不单独用 QueryBoundary，骨架过度）。 */
function statText(isLoading: boolean, isError: boolean, value: unknown): string {
  if (isLoading || isError || value == null) return '—';
  return String(value);
}

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const rider = useAuthStore((s) => s.rider);
  const { logout } = useAuth();
  const hydrate = useAuthStore((s) => s.hydrate);
  // P1 §3.1①：今日订单/收入接 useOrderTodayStats（real `/rider/orders/today-stats`，E3 history 同源）
  const { data: todayStats, isLoading: todayLoading, isError: todayError } = useOrderTodayStats();

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

  // P1 §3.1：统计区三栏真实数据
  const todayCount = statText(todayLoading, todayError, todayStats?.count);
  const todayIncome = todayLoading || todayError || todayStats == null
    ? '—'
    : formatCurrency(todayStats.totalIncome, t('common.currency'));
  // 拍板 ①A：第三栏改总配送（积分/等级后端无字段，fallback 真实存在的 totalDeliveries）
  const totalDeliveries = statText(false, false, rider?.totalDeliveries);
  // 拍板 ②A：评分星标 ★ {rating.toFixed(1)}，real 后端有值 / mock 为 5
  const ratingText = rider?.rating != null ? rider.rating.toFixed(1) : '—';

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-12">
      {/* 拍板 ⑤A：接 SimplePageHeader + 返回走 useGoBack（fallbackHref=tasks）。
          拍板（sticky 外壳）：原页头 sticky top-0 z-50，SimplePageHeader 非 sticky，
          外包 View 补悬浮保留原视觉。 */}
      <View className="sticky top-0 z-50">
        <SimplePageHeader
          action={
            <Pressable accessibilityRole="button" accessibilityLabel={t('profile.edit')} className="rounded-full p-2" onPress={() => router.push('/profile/edit')}>
              <Text className="font-bold text-primary">{t('profile.edit')}</Text>
            </Pressable>
          }
          backLabel={t('common.back')}
          fallbackHref="/(main)/tasks"
          title={t('profile.title')}
        />
      </View>

      <View className="items-center gap-4 px-5 pb-2 pt-4">
        <View className="relative items-center">
          {/* P1 §3.3：头像兜底——avatarUrl 为空渲染 AppIcon rider 默认头像（tier-gold-soft 圆底） */}
          <View className="h-24 w-24 rounded-full bg-tier-gold-soft p-[3px]">
            {rider?.avatarUrl ? (
              <Image className="h-full w-full rounded-full border-2 border-surface" resizeMode="cover" source={{ uri: rider.avatarUrl }} />
            ) : (
              <View className="h-full w-full items-center justify-center rounded-full border-2 border-surface">
                <AppIcon name="rider" size={40} />
              </View>
            )}
          </View>
          {/* 拍板 ②A：tier 徽章改评分星标 ★ {rating}（tier-gold 底，复用真实 rider.rating） */}
          <View className="absolute -bottom-3 flex-row items-center gap-1 rounded-full border-2 border-surface bg-tier-gold px-3 py-1 shadow-sm">
            <Text className="text-[11px] font-bold text-tier-gold-text">★ {ratingText} {t('profile.ratingSuffix')}</Text>
          </View>
        </View>
        <View className="mt-2 items-center">
          <Text className="text-2xl font-bold text-on-surface">{rider?.name ?? t('profile.name')}</Text>
          <View className="mt-1 flex-row items-center gap-2">
            <Text className="text-sm text-on-surface-variant">{t('profile.riderId', { id: rider?.id ?? '—' })}</Text>
          </View>
        </View>
      </View>

      {/* P1 §3.1①：统计区三栏接真实数据（今日订单 / 今日收入 / 总配送） */}
      <View className="mx-5 mb-8 mt-4 overflow-hidden rounded-[24px] border border-surface-container-high bg-surface-container-high px-6 py-8 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 items-center">
            <Text className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('profile.orders')}</Text>
            <Text className="text-4xl font-medium text-primary">{todayCount}</Text>
            <Text className="mt-1 text-[9px] font-bold uppercase text-outline">{t('profile.today')}</Text>
          </View>
          <View className="h-12 w-px bg-outline-variant" />
          <View className="flex-[1.2] items-center px-2">
            <Text className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('profile.earnings')}</Text>
            <Text className="text-4xl font-bold text-primary">{todayIncome}</Text>
            <Text className="mt-1 text-[9px] font-bold uppercase text-outline">{t('profile.today')}</Text>
          </View>
          <View className="h-12 w-px bg-outline-variant" />
          <View className="flex-1 items-center">
            <Text className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('profile.totalDeliveries')}</Text>
            <Text className="text-4xl font-medium text-primary">{totalDeliveries}</Text>
            <Text className="mt-1 text-[9px] font-bold uppercase text-outline">{t('profile.totalDeliveriesSub')}</Text>
          </View>
        </View>
      </View>

      <View className="mx-5 mb-8 flex-row gap-4">
        <Pressable accessibilityRole="button" accessibilityLabel={t('profile.myOrders')} className="flex-1 flex-row items-center gap-4 rounded-2xl border border-surface-container bg-surface p-5 shadow-sm" onPress={() => router.push('/order/history')}>
          <View className="rounded-xl bg-surface-container p-3">
            <AppIcon name="orders" className="text-xl text-primary" />
          </View>
          <Text className="text-[17px] font-semibold text-on-surface">{t('profile.myOrders')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('profile.myWallet')} className="flex-1 flex-row items-center gap-4 rounded-2xl border border-surface-container bg-surface p-5 shadow-sm" onPress={() => router.push('/(main)/earnings')}>
          <View className="rounded-xl bg-surface-container p-3">
            <AppIcon name="wallet" className="text-xl text-primary" />
          </View>
          <Text className="text-[17px] font-semibold text-on-surface">{t('profile.myWallet')}</Text>
        </Pressable>
      </View>

      <View className="mx-5 overflow-hidden rounded-[20px] border border-surface-container bg-surface shadow-sm">
        {/* 拍板 ④A：收入明细 MenuItem 改跳 /order/history（与「我的钱包」卡片 /(main)/earnings 区分目标） */}
        <MenuItem icon="wallet" label={t('profile.earningsHistory')} onPress={() => router.push('/order/history')} />
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
