// TicketDetailPage — 工单详情 + 时间线（替换品批2 工单化 2026-10-29）
// 数据源：useTicket(ticketNo)（GET /client/tickets/:ticketNo）+ useTicketEvents（/:ticketNo/events 游标分页 D16）
// 路由：/(main)/tickets/[ticketNo]，列表页卡片点击进入
import { StyleSheet, View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeBack } from '@/hooks/useSafeBack';
import { formatDate } from '@/utils/format';
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { OfflineBanner } from '@/components/feedback/OfflineBanner';
import { Icon } from '@/components/ui/Icon';
import { flattenTicketEventPages, useTicket, useTicketEvents } from '@/services/queries/useTickets';
import { useWeakNetworkUI } from '@/hooks/useWeakNetworkUI';
import type { TicketEventRaw } from '@/services/tickets';
import type { AppColors } from '@/theme';
import { PageErrorBoundary } from '@/components/feedback/PageErrorBoundary/PageErrorBoundary';

// status -> 色块底色（列表页同款映射）
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

// operatorType -> 图标（SYSTEM 自动建单 / ADMIN 客服处理 / CUSTOMER 用户）
function operatorIcon(operatorType: string): 'smart_toy' | 'support_agent' | 'person' {
  switch (operatorType) {
    case 'SYSTEM':
      return 'smart_toy';
    case 'ADMIN':
      return 'support_agent';
    default:
      return 'person';
  }
}

export default function TicketDetailPage() {
  const handleBack = useSafeBack();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { isOffline } = useWeakNetworkUI();
  // ticketNo 语义 = 后端工单业务键（TKxxx，D20 回显），非内部 id
  const { ticketNo } = useLocalSearchParams<{ ticketNo: string }>();
  const { data: ticket, isLoading, isError, refetch } = useTicket(ticketNo);
  const {
    data: eventPages,
    isLoading: eventsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTicketEvents(ticketNo);
  const events = flattenTicketEventPages(eventPages?.pages);

  if (isLoading) {
    return (
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        <PrimaryHeader title={t('tickets.detailTitle')} showBack onBackPress={handleBack} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaWrapper>
    );
  }

  if (isError || !ticket) {
    return (
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        <PrimaryHeader title={t('tickets.detailTitle')} showBack onBackPress={handleBack} />
        <View style={styles.emptyBox}>
          <ErrorState message={t('errors.generic')} onRetry={() => refetch()} />
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <PageErrorBoundary pageName="ticket-detail">
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        <PrimaryHeader title={t('tickets.detailTitle')} showBack onBackPress={handleBack} />
        {isOffline && <OfflineBanner />}
        <FlatList
          data={events}
          keyExtractor={(ev: TicketEventRaw) => ev.id}
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
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => refetch()}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              {/* 工单卡：ticketNo + 状态 + 类型 + 时限 */}
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors['surface-container-lowest'],
                    borderColor: colors['outline-variant'],
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.ticketNo, { color: colors['on-surface'] }]}>
                    {ticket.ticketNo}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColor(ticket.status, colors) },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {t(`tickets.status.${ticket.status}`, { defaultValue: ticket.status })}
                    </Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors['on-surface-variant'] }]}>
                    {t('tickets.typeLabel')}
                  </Text>
                  <Text style={[styles.metaValue, { color: colors['on-surface'] }]}>
                    {t(`tickets.type.${ticket.type}`, { defaultValue: ticket.type })}
                  </Text>
                </View>
                {/* D11 时限（配置缺失后端返 null → 该行隐藏） */}
                {ticket.resolveDue && (
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaLabel, { color: colors['on-surface-variant'] }]}>
                      {t('tickets.resolveDueLabel')}
                    </Text>
                    <Text style={[styles.metaValue, { color: colors['on-surface'] }]}>
                      {formatDate(ticket.resolveDue, i18n.language)}
                    </Text>
                  </View>
                )}
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors['on-surface-variant'] }]}>
                    {t('tickets.createdAtLabel')}
                  </Text>
                  <Text style={[styles.metaValue, { color: colors['on-surface'] }]}>
                    {formatDate(ticket.createdAt, i18n.language)}
                  </Text>
                </View>
              </View>

              {/* 时间线标题 */}
              <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
                {t('tickets.timelineTitle')}
              </Text>
              {eventsLoading ? (
                <ActivityIndicator style={styles.footer} color={colors.primary} />
              ) : events.length === 0 ? (
                <Text style={[styles.emptyEvents, { color: colors['on-surface-variant'] }]}>
                  {t('tickets.noEvents')}
                </Text>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.eventRow}>
              <View
                style={[styles.eventIconWrap, { backgroundColor: colors['surface-container-low'] }]}
              >
                <Icon
                  symbol={operatorIcon(item.operatorType)}
                  size={18}
                  color={colors['on-surface-variant']}
                />
              </View>
              <View style={styles.eventBody}>
                <View style={styles.eventHead}>
                  <Text style={[styles.eventType, { color: colors['on-surface'] }]}>
                    {t(`tickets.event.${item.eventType}`, { defaultValue: item.eventType })}
                  </Text>
                  <Text style={[styles.eventTime, { color: colors['on-surface-variant'] }]}>
                    {formatDate(item.createdAt, i18n.language)}
                  </Text>
                </View>
                {!!item.note && (
                  <Text style={[styles.eventNote, { color: colors['on-surface-variant'] }]}>
                    {item.note}
                  </Text>
                )}
              </View>
            </View>
          )}
        />
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
  headerBlock: {
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
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    ...typography['body-sm'],
  },
  metaValue: {
    ...typography['body-sm'],
    fontWeight: '600',
  },
  sectionTitle: {
    ...typography['body-md'],
    fontWeight: '600',
  },
  emptyEvents: {
    ...typography['body-sm'],
  },
  eventRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  eventIconWrap: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventBody: {
    flex: 1,
    gap: 2,
  },
  eventHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventType: {
    ...typography['body-sm'],
    fontWeight: '600',
  },
  eventTime: {
    ...typography['body-sm'],
  },
  eventNote: {
    ...typography['body-sm'],
  },
  footer: {
    paddingVertical: spacing.md,
  },
});
