// ⚠️ 无 HTML 原型，参考 OrderListPage 推导实现，待设计确认
// CouponListPage — 优惠券列表（参考 OrderListPage.html 的 Tab 栏 + 卡片列表）
// D.11: PrimaryHeader + Tab 栏（未使用/已使用/已过期）+ 优惠券卡片 + 领取中心入口
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
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { CouponCard } from '@/components/business/CouponCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { useCoupons } from '@/services/queries/useUser';
import type { Coupon } from '@/types';

type TabKey = 'available' | 'used' | 'expired';

export default function CouponsPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('available');
  const { data: coupons, isLoading, isError, refetch } = useCoupons();

  const counts = useMemo(() => {
    const now = new Date();
    return {
      available: coupons?.filter((c) => !c.used && new Date(c.validUntil) > now).length ?? 0,
      used: coupons?.filter((c) => c.used).length ?? 0,
      expired: coupons?.filter((c) => !c.used && new Date(c.validUntil) <= now).length ?? 0,
    };
  }, [coupons]);

  const filtered = useMemo(() => {
    if (!coupons) return [];
    const now = new Date();
    if (tab === 'available') {
      return coupons.filter((c) => !c.used && new Date(c.validUntil) > now);
    }
    if (tab === 'used') {
      return coupons.filter((c) => c.used);
    }
    return coupons.filter((c) => !c.used && new Date(c.validUntil) <= now);
  }, [coupons, tab]);

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
      <PrimaryHeader title={t('coupons.title')} showBack onBackPress={() => router.back()} />

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
          onPress={() => router.push('/(main)/home')}
          style={({ pressed }) => [
            styles.centerBanner,
            { backgroundColor: colors.primary },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Coupon center"
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

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <ErrorState message={t('coupons.loadError')} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t('coupons.empty')}
          description={t('coupons.emptyDesc')}
          icon="ticket-percent"
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }: { item: Coupon }) => (
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
    paddingHorizontal: spacing['container-margin'],
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
  centerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    margin: spacing['container-margin'],
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
    padding: spacing['container-margin'],
    paddingBottom: spacing.xxl * 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
