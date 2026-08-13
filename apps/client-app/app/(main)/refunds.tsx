// RefundsListPage — profile「退款售后」入口，用户退款申请列表
// 数据源：useRefunds（GET /client/refunds -> RefundRaw[]），useCreateRefund 乐观更新联动
// 点击退款卡跳 /order/after-sales-detail（P14 售后详情页，传 refund.id）
import { useState } from 'react';
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
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { OfflineBanner } from '@/components/feedback/OfflineBanner';
import { PriceText } from '@/components/ui/PriceText';
import { Icon } from '@/components/ui/Icon';
import { useRefunds } from '@/services/queries/useRefunds';
import { useWeakNetworkUI } from '@/hooks/useWeakNetworkUI';
import type { RefundRaw } from '@/services/refunds';
import type { AppColors } from '@/theme';
import { PageErrorBoundary } from '@/components/feedback/PageErrorBoundary/PageErrorBoundary';

// 原因：状态色块上的固定白字（pending/approved 底色），dark 模式不变（同 cart.tsx ON_PRIMARY）
const ON_PRIMARY = '#ffffff';

type RefundTabKey = 'all' | 'inProgress' | 'done';

const REFUND_TABS: { key: RefundTabKey; labelKey: string }[] = [
  { key: 'all', labelKey: 'refunds.tabAll' },
  { key: 'inProgress', labelKey: 'refunds.tabInProgress' },
  { key: 'done', labelKey: 'refunds.tabDone' },
];

function isInProgress(status: string): boolean {
  return status === 'PENDING' || status === 'APPROVED';
}
function isDone(status: string): boolean {
  return status === 'COMPLETED';
}

// status -> 色块底色（PENDING 琥珀 / APPROVED 绿 / COMPLETED 灰 / REJECTED 红 / CANCELLED 灰）
function statusColor(status: string, colors: AppColors): string {
  switch (status) {
    case 'PENDING':
      return colors.semantic.warning;
    case 'APPROVED':
      return colors.semantic.positive;
    case 'REJECTED':
      return colors.error;
    case 'COMPLETED':
    case 'CANCELLED':
    default:
      return colors['on-surface-variant'];
  }
}

export default function RefundsPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isOffline } = useWeakNetworkUI();
  const [active, setActive] = useState<RefundTabKey>('all');
  const { data: refunds, isLoading, isError, refetch } = useRefunds();

  const filtered = (refunds ?? []).filter((r) => {
    if (active === 'all') return true;
    if (active === 'inProgress') return isInProgress(r.status);
    return isDone(r.status);
  });

  return (
    <PageErrorBoundary pageName="refunds">
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        <PrimaryHeader title={t('refunds.title')} showBack onBackPress={() => router.back()} />
        {isOffline && <OfflineBanner />}

        {/* 状态筛选 tab（全部 / 进行中 / 已完成） */}
        <View style={[styles.tabRow, { borderBottomColor: colors['outline-variant'] }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {REFUND_TABS.map((tab) => {
              const activeTab = tab.key === active;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActive(tab.key)}
                  style={[
                    styles.tab,
                    activeTab && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeTab }}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: activeTab ? colors.primary : colors['on-surface-variant'] },
                    ]}
                  >
                    {t(tab.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : isError ? (
          <ErrorState message={t('errors.generic')} onRetry={() => refetch()} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <EmptyState
              title={t('refunds.empty')}
              description={t('refunds.emptyDesc')}
              icon="receipt_long"
              actionLabel={t('refunds.goOrders')}
              onAction={() => router.push('/(main)/orders')}
            />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(r: RefundRaw) => r.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/order/after-sales-detail',
                    params: { id: item.id },
                  })
                }
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: colors['surface-container-lowest'],
                    borderColor: colors['outline-variant'],
                  },
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('refunds.a11y.item', {
                  // Q1：用 orderId（用户认知订单号）而非 refund.id（内部标识），读屏可对照
                  id: item.orderId.slice(-8),
                  // Q3：defaultValue 兜底，防后端加新 status 值时 a11y 读 key 路径
                  status: t(`refunds.status.${item.status}`, { defaultValue: item.status }),
                })}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.orderNo, { color: colors['on-surface-variant'] }]}>
                    {t('refunds.orderPrefix')} #{item.orderId.slice(-8)}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status, colors) }]}>
                    <Text style={styles.statusText}>{t(`refunds.status.${item.status}`, { defaultValue: item.status })}</Text>
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.amountRow}>
                    <Text style={[styles.amountLabel, { color: colors['on-surface-variant'] }]}>
                      {t('refunds.amountLabel')}
                    </Text>
                    {/* item.amount 后端是分，/100 转元（PriceText 显示元，与 orders/cart 一致） */}
                    <PriceText value={Math.max(0, item.amount) / 100} size="md" />
                  </View>
                  <View style={styles.amountRow}>
                    <Text style={[styles.amountLabel, { color: colors['on-surface-variant'] }]}>
                      {t('refunds.methodLabel')}
                    </Text>
                    <Text style={[styles.methodText, { color: colors['on-surface'] }]}>
                      {t(`refunds.method.${item.refundMethod}`, { defaultValue: item.refundMethod })}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={[styles.timeText, { color: colors['on-surface-variant'] }]}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                  <Icon symbol="chevron_right" size={20} color={colors['on-surface-variant']} />
                </View>
              </Pressable>
            )}
          />
        )}
      </SafeAreaWrapper>
    </PageErrorBoundary>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabScroll: {
    paddingHorizontal: layout['container-margin'],
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    ...typography['body-sm'],
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
  },
  list: {
    padding: layout['container-margin'],
    gap: spacing.md,
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadowPresets.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderNo: {
    ...typography['body-sm'],
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.md,
  },
  statusText: {
    color: ON_PRIMARY,
    ...typography['label-caps'],
    fontSize: 10,
    fontWeight: '700',
  },
  cardBody: {
    gap: spacing.xs,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountLabel: {
    ...typography['body-sm'],
  },
  methodText: {
    ...typography['body-sm'],
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent',
  },
  timeText: {
    ...typography['label-caps'],
    fontSize: 11,
  },
});
