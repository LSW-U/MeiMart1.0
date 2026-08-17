// CouponListPage — 优惠券列表
// P18 优化（第四梯队HTML原型设计/P18-P19-优惠券与收藏页-优化原型.html）：
//   三 tab 状态独立（当前 tab 的 loading/error/empty，不再三 query 合并）
//   + 近过期提醒 + 分 tab 空态（含未登录）+ 领券入口视觉降级
//   券卡视觉字段（type/cap/desc/chips/去逛逛）归《优惠券卡片模块》方案，本页只调 props
import { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { CouponCard } from '@/components/business/CouponCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { useCoupons } from '@/services/queries/usePromotion';
import { useAuthStore } from '@/store/authStore';
import type { ClientCoupon } from '@/services/promotion';

type TabKey = 'available' | 'used' | 'expired';

export default function CouponsPage() {
  const handleBack = useSafeBack();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('available');
  // P18 D6：未登录 → 登录/注册空态（useCoupons enabled=isAuth，未登录 data 空命中空态）
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // Why: 三 tab 并行各调 useCoupons(status) —— 后端 ?status= 端点已就绪（6dc4c81），
  //      各 status 独立缓存（COUPONS_QUERY_KEY 含 status），tab 切换瞬时（数据已拉）
  const availableQ = useCoupons('available');
  const usedQ = useCoupons('used');
  const expiredQ = useCoupons('expired');

  // P18 D3：available 中 3 天内过期的券数（提醒条只在此 tab 且 count>0 显示）
  const expiringCount = useMemo(() => {
    // 原因：近过期判断需 Date.now() 算剩余时长，无纯函数替代；query data 变化时重算，计数稳定
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
    return (availableQ.data ?? []).filter((c) => {
      const end = new Date(c.endAt).getTime() - now;
      return end > 0 && end <= THREE_DAYS;
    }).length;
  }, [availableQ.data]);

  const counts = {
    available: availableQ.data?.length ?? 0,
    used: usedQ.data?.length ?? 0,
    expired: expiredQ.data?.length ?? 0,
  };

  const filtered = useMemo(() => {
    const data =
      tab === 'available' ? availableQ.data : tab === 'used' ? usedQ.data : expiredQ.data;
    return data ?? [];
  }, [tab, availableQ.data, usedQ.data, expiredQ.data]);

  // P18 D2：三态只看当前 tab query —— 三 query 并行预取，但 loading/error/重试
  //      均按当前 tab 独立（原实现任一 tab error 整页报错，切到正常 tab 也被殃及）
  const activeQ = tab === 'available' ? availableQ : tab === 'used' ? usedQ : expiredQ;
  const isLoading = activeQ.isLoading;
  const isError = activeQ.isError;
  const refetch = () => {
    activeQ.refetch();
  };

  const TABS: { key: TabKey; label: string; count: number }[] = [
    {
      key: 'available',
      label: t('coupons.tabAvailable', { defaultValue: 'Available' }),
      count: counts.available,
    },
    { key: 'used', label: t('coupons.tabUsed', { defaultValue: 'Used' }), count: counts.used },
    {
      key: 'expired',
      label: t('coupons.tabExpired', { defaultValue: 'Expired' }),
      count: counts.expired,
    },
  ];

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <PrimaryHeader title={t('coupons.title')} showBack onBackPress={handleBack} />

      {/* Tab 栏 */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: colors['surface-container-lowest'],
            borderBottomColor: 'rgba(141,112,108,0.3)',
          },
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabRow}>
            {TABS.map((tabItem) => {
              const isActive = tabItem.key === tab;
              return (
                <Pressable
                  key={tabItem.key}
                  onPress={() => setTab(tabItem.key)}
                  style={styles.tabBtn}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={tabItem.label}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: isActive ? colors.primary : colors['on-surface-variant'],
                      },
                    ]}
                  >
                    {tabItem.label}
                  </Text>
                  <View
                    style={[
                      styles.tabBadge,
                      {
                        backgroundColor: isActive ? colors.primary : colors['outline-variant'],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabBadgeText,
                        { color: isActive ? '#ffffff' : colors['on-surface-variant'] },
                      ]}
                    >
                      {tabItem.count}
                    </Text>
                  </View>
                  {isActive && (
                    <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* 领取中心入口（仅 available Tab 显示） */}
      {tab === 'available' && (
        <Pressable
          onPress={() => router.push('/coupons/claim')}
          style={({ pressed }) => [
            styles.centerBanner,
            { backgroundColor: colors.primary },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('coupons.centerTitle')}
          testID="coupon-center"
        >
          <View style={styles.centerIconWrap}>
            <Icon symbol="local_offer" size={20} color="#ffffff" />
          </View>
          <View style={styles.centerTextBox}>
            <Text style={styles.centerTitle}>
              {t('coupons.centerTitle', { defaultValue: 'Coupon Center' })}
            </Text>
            <Text style={styles.centerDesc}>
              {t('coupons.centerDesc', { defaultValue: 'Claim more exclusive coupons' })}
            </Text>
          </View>
          <Icon symbol="arrow_forward" size={20} color="#ffffff" />
        </Pressable>
      )}

      {/* P18 D3：近过期提醒条（仅 available tab 且存在 3 天内到期券） */}
      {/* P18 D3：近过期提醒条（仅 available tab 且存在 3 天内到期券）。
          Why: warning-container/warning 是 semantic 角色色不在 AppColors 类型上
               （P16 tagThemes 同款约束），单处使用按场景色板先例内联 hex：#fef3c7 / #F57C00 */}
      {tab === 'available' && !isLoading && !isError && expiringCount > 0 && (
        <View
          style={[styles.expiringBanner, { backgroundColor: '#fef3c7' }]}
          accessibilityLabel={t('coupons.expiringSoon', { count: expiringCount })}
          testID="coupon-expiring"
        >
          <Icon symbol="schedule" size={16} color="#F57C00" />
          <Text style={[styles.expiringText, { color: '#F57C00' }]}>
            {t('coupons.expiringSoon', { count: expiringCount })}
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <ErrorState message={t('coupons.loadError')} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        // P18 D6：空态分 tab —— 未登录显示登录引导；available 引导去领券中心；
        // used/expired 是低频正常态，无 action
        !isAuthenticated ? (
          <EmptyState
            title={t('coupons.loginTitle')}
            description={t('coupons.loginDesc')}
            icon="ticket-percent"
            actionLabel={t('profile.loginRegister')}
            onAction={() => router.replace('/(auth)/login')}
          />
        ) : tab === 'available' ? (
          <EmptyState
            title={t('coupons.emptyAvailableTitle')}
            description={t('coupons.emptyAvailableDesc')}
            icon="ticket-percent"
            actionLabel={t('coupons.goClaim')}
            onAction={() => router.push('/coupons/claim')}
          />
        ) : tab === 'used' ? (
          <EmptyState
            title={t('coupons.emptyUsedTitle')}
            description={t('coupons.emptyUsedDesc')}
            icon="ticket-percent"
          />
        ) : (
          <EmptyState
            title={t('coupons.emptyExpiredTitle')}
            description={t('coupons.emptyExpiredDesc')}
            icon="ticket-percent"
          />
        )
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={5}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }: { item: ClientCoupon }) => (
            <View style={shadowPresets.sm}>
              <CouponCard coupon={item} onUse={() => router.push('/(main)/home')} />
            </View>
          )}
        />
      )}
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: layout['container-margin'],
  },
  tabBtn: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 4,
  },
  tabText: {
    ...typography['label-caps'],
    fontSize: 13,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: spacing.md,
    right: spacing.md,
    height: 2,
    borderRadius: 1,
  },
  expiringBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: layout['container-margin'],
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
  },
  expiringText: {
    ...typography['body-sm'],
    fontWeight: '600',
    flex: 1,
  },
  centerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    margin: layout['container-margin'],
    padding: spacing.md,
    borderRadius: borderRadius.xl,
  },
  centerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  centerTextBox: {
    flex: 1,
    gap: 2,
  },
  centerTitle: {
    color: '#ffffff',
    ...typography['body-md'],
    fontWeight: '700',
  },
  centerDesc: {
    color: 'rgba(255,255,255,0.85)',
    ...typography['label-caps'],
    fontSize: 10,
  },
  list: {
    padding: layout['container-margin'],
    paddingBottom: spacing.xxl * 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
