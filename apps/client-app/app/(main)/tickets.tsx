// TicketsPage — profile「我的工单」入口，用户工单列表（替换品批2 工单化 2026-10-29）
// 数据源：useTickets（GET /client/tickets 游标分页）；点击工单卡跳详情页（传 ticketNo）
import { StyleSheet, View, Text, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeBack } from '@/hooks/useSafeBack';
import { formatDate } from '@/utils/format';
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { OfflineBanner } from '@/components/feedback/OfflineBanner';
import { Icon } from '@/components/ui/Icon';
import { flattenTicketPages, useTickets } from '@/services/queries/useTickets';
import { useWeakNetworkUI } from '@/hooks/useWeakNetworkUI';
import type { TicketRaw } from '@/services/tickets';
import type { AppColors } from '@/theme';
import { PageErrorBoundary } from '@/components/feedback/PageErrorBoundary/PageErrorBoundary';

// status -> 色块底色（OPEN 琥珀 / IN_PROGRESS 蓝 / RESOLVED 绿 / CLOSED 灰）
function statusColor(status: string, colors: AppColors): string {
  switch (status) {
    case 'OPEN':
      return colors.semantic.warning;
    case 'IN_PROGRESS':
      return colors.primary;
    case 'RESOLVED':
      return colors.semantic.positive;
    case 'CLOSED':
    default:
      return colors['on-surface-variant'];
  }
}

export default function TicketsPage() {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  // router.back() 换 useSafeBack（深链直进无历史时兜底 home，refunds 页同款）
  const handleBack = useSafeBack();
  const { isOffline } = useWeakNetworkUI();
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTickets();
  const tickets = flattenTicketPages(data?.pages);

  return (
    <PageErrorBoundary pageName="tickets">
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        <PrimaryHeader title={t('tickets.title')} showBack onBackPress={handleBack} />
        {isOffline && <OfflineBanner />}

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : isError ? (
          <ErrorState message={t('errors.generic')} onRetry={() => refetch()} />
        ) : tickets.length === 0 ? (
          <View style={styles.emptyBox}>
            <EmptyState
              title={t('tickets.empty')}
              description={t('tickets.emptyDesc')}
              icon="confirmation_number"
            />
          </View>
        ) : (
          <FlatList
            data={tickets}
            keyExtractor={(t: TicketRaw) => t.ticketNo}
            contentContainerStyle={styles.list}
            onEndReachedThreshold={0.2}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) fetchNextPage();
            }}
            ListFooterComponent={
              isFetchingNextPage ? (
                <ActivityIndicator style={styles.footer} color={colors.primary} />
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/(main)/tickets/[ticketNo]',
                    params: { ticketNo: item.ticketNo },
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
                accessibilityLabel={t('tickets.a11y.item', {
                  ticketNo: item.ticketNo,
                  // defaultValue 兜底，防后端加新 status/type 值时读屏读 key 路径（refunds 同款）
                  status: t(`tickets.status.${item.status}`, { defaultValue: item.status }),
                })}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.ticketNo, { color: colors['on-surface'] }]}>
                    {item.ticketNo}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColor(item.status, colors) },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {t(`tickets.status.${item.status}`, { defaultValue: item.status })}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.typeText, { color: colors['on-surface-variant'] }]}>
                  {t(`tickets.type.${item.type}`, { defaultValue: item.type })}
                </Text>
                <View style={styles.cardFooter}>
                  <Text style={[styles.timeText, { color: colors['on-surface-variant'] }]}>
                    {formatDate(item.createdAt, i18n.language)}
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
  ticketNo: {
    ...typography['body-md'],
    fontWeight: '600',
  },
  statusBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusText: {
    ...typography['body-sm'],
    color: '#ffffff',
    fontWeight: '600',
  },
  typeText: {
    ...typography['body-sm'],
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeText: {
    ...typography['body-sm'],
  },
  footer: {
    paddingVertical: spacing.md,
  },
});
