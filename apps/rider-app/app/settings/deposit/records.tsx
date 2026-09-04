/**
 * 保证金缴存记录页 — /settings/deposit/records（批 G；批 H 修幽灵 token + 重提跳 /pay）
 *
 * HTML 原型 6.4 逐屏还原：
 *   - 四态记录卡：PENDING（橙+骑手说明）/ CONFIRMED（绿+实收额，admin 修正时
 *     显示「申请 $X → 确认 $Y」）/ REJECTED（红+admin 备注+重新提交按钮）/ REFUNDED
 *   - 通道标识（线上 / 线下 COD）+ 缴纳点 + 时间
 *   - REJECTED「重新提交」→ 跳缴纳子页 /settings/deposit/pay 预填原金额
 *     （批 G 跳详情页，批 H 拍板 6 拆页后改跳子页）
 *
 * 数据源：GET /rider/deposit/status 的 recentRequests（批 B 契约，take 10）
 */
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppIcon } from '@/src/components/ui/AppIcon';
import { SimplePageHeader } from '@/src/components/layout/SimplePageHeader';
import { EmptyState } from '@/src/components/feedback/EmptyState';
import { colors } from '@/src/theme/colors';
import { useTranslation } from '@/src/i18n/useTranslation';
import { formatCurrency } from '@/src/utils/format';
import { useDepositStatus, useDepositLocations } from '@/src/services/queries/useDeposit';
import type { DepositRecord } from '@/src/services/deposit';

/** 状态视觉配置（icon + 配对语义色，HTML record-item 四态） */
function statusVisual(status: DepositRecord['status']) {
  switch (status) {
    case 'CONFIRMED':
      return { icon: 'check' as const, bg: colors.statusSuccessBg, fg: colors.statusDoneText };
    case 'PENDING':
      return { icon: 'clock' as const, bg: colors.statusWarningBg, fg: colors.warnText };
    case 'REJECTED':
      return { icon: 'info' as const, bg: colors.statusDangerBg, fg: colors.statusDangerText };
    case 'REFUNDED':
      return { icon: 'arrowDown' as const, bg: colors.statusDangerBg, fg: colors.statusDangerText };
  }
}

export default function DepositRecordsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const currency = t('common.currency');

  const { data: status, isLoading, refetch } = useDepositStatus();
  const locationsQuery = useDepositLocations();
  const locations = locationsQuery.data ?? [];

  const records = status?.recentRequests ?? [];

  const statusLabel = (status: DepositRecord['status']) =>
    ({
      PENDING: t('deposit.badge.pending'),
      CONFIRMED: t('deposit.badge.confirmed'),
      REJECTED: t('deposit.badge.rejected'),
      REFUNDED: t('deposit.badge.refunded'),
    })[status];

  return (
    <View className="flex-1 bg-background">
      <SimplePageHeader backLabel={t('common.back')} title={t('deposit.records.title')} />
      <ScrollView contentContainerClassName="px-4 py-5 pb-12">
        {isLoading ? (
          <Text className="py-8 text-center text-sm text-on-surface-variant">
            {t('duty.loading')}
          </Text>
        ) : records.length === 0 ? (
          <EmptyState
            description={t('deposit.records.emptyDescription')}
            title={t('deposit.records.emptyTitle')}
          />
        ) : (
          <View className="overflow-hidden rounded-2xl border border-surface-variant bg-surface">
            {records.map((record, index) => {
              const visual = statusVisual(record.status);
              const locationName = locations.find((l) => l.id === record.locationId)?.name;
              const isModified =
                record.status === 'CONFIRMED' &&
                record.confirmedAmount !== null &&
                record.confirmedAmount !== record.requestedAmount;
              return (
                <View className="gap-2 px-4 py-3.5" key={record.id}>
                  {index > 0 && (
                    <View className="absolute inset-x-4 top-0 h-px bg-outline-variant/40" />
                  )}
                  <View className="mt-1 flex-row gap-3">
                    {/* 状态图标（HTML r-icon） */}
                    <View
                      accessibilityLabel={statusLabel(record.status)}
                      className="h-9 w-9 items-center justify-center rounded-xl"
                      style={{ backgroundColor: visual.bg }}
                    >
                      <AppIcon color={visual.fg} name={visual.icon} size={18} />
                    </View>
                    <View className="flex-1">
                      {/* 标题行：通道 + 状态 / 金额 */}
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-bold text-on-surface">
                          {record.channel === 'ONLINE_MOCK'
                            ? t('deposit.records.channelOnline')
                            : t('deposit.records.channelCod')}
                          {' · '}
                          {statusLabel(record.status)}
                        </Text>
                        <Text className="text-sm font-bold" style={{ color: visual.fg }}>
                          {record.status === 'CONFIRMED' && record.confirmedAmount !== null
                            ? formatCurrency(record.confirmedAmount / 100, currency, { sign: true })
                            : formatCurrency(record.requestedAmount / 100, currency)}
                        </Text>
                      </View>
                      {/* meta：时间 + 缴纳点 */}
                      <Text className="mt-1 text-xs text-on-surface-variant">
                        {new Date(record.createdAt).toLocaleString()}
                        {locationName ? ` · ${locationName}` : ''}
                      </Text>
                      {/* 骑手说明（PENDING 保留显示，HTML change-card 13） */}
                      {record.note && (
                        <Text className="mt-1 rounded-md bg-surface-container-low px-2 py-1 text-xs text-on-surface-variant">
                          {t('deposit.records.riderNotePrefix')}
                          {record.note}
                        </Text>
                      )}
                      {/* admin 修正：申请 $X → 确认 $Y */}
                      {isModified && record.confirmedAmount !== null && (
                        <Text className="mt-1 rounded-md bg-surface-container-low px-2 py-1 text-xs text-on-surface-variant">
                          {t('deposit.records.modifiedAmount', {
                            requested: formatCurrency(record.requestedAmount / 100, currency),
                            confirmed: formatCurrency(record.confirmedAmount / 100, currency),
                          })}
                        </Text>
                      )}
                      {/* admin 备注（REJECTED 红色高亮，CONFIRMED 常规） */}
                      {record.adminNote && (
                        <Text
                          className={`mt-1 rounded-md px-2 py-1 text-xs ${
                            record.status === 'REJECTED'
                              ? 'bg-status-danger-bg text-status-danger-text'
                              : 'bg-surface-container-low text-on-surface-variant'
                          }`}
                        >
                          {t('deposit.records.adminNotePrefix')}
                          {record.adminNote}
                        </Text>
                      )}
                      {/* REJECTED 重新提交（拍板 ⑦：预填原金额跳缴纳页） */}
                      {record.status === 'REJECTED' && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t('deposit.records.resubmit')}
                          className="mt-1.5 self-start rounded-lg border border-primary px-3 py-1"
                          onPress={() =>
                            router.navigate({
                              pathname: '/settings/deposit/pay',
                              params: { resubmitAmount: String(record.requestedAmount) },
                            })
                          }
                        >
                          <Text className="text-xs font-bold text-primary">
                            {t('deposit.records.resubmit')}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        {records.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.retry')}
            className="mt-4 items-center"
            onPress={() => void refetch()}
          >
            <Text className="text-xs font-semibold text-on-surface-variant">
              {t('common.retry')}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
