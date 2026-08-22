import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { EarningCard } from '../../src/components/business/EarningCard';
import { HistoryItem } from '../../src/components/business/HistoryItem';
import { QueryBoundary } from '../../src/components/feedback/QueryBoundary';
import { AppIcon, Button } from '../../src/components/ui';
import { useGoBack } from '../../src/hooks/useGoBack';
import { useTranslation, type TranslationKey } from '../../src/i18n/useTranslation';
import { colors } from '../../src/theme/colors';
import type { EarningSummary, EarningTransaction } from '../../src/types/earnings';
import { useEarningSummary, useEarningTransactions } from '../../src/services/queries/useEarnings';
import { formatCurrency } from '../../src/utils/format';
import { useState } from 'react';

type BillingTab = 'today' | 'all';

/** E1 §3.3 日期分组桶：今日/昨日/更早（「全部账单」tab） */
type TxGroup = { key: 'today' | 'yesterday' | 'earlier'; items: EarningTransaction[] };

/**
 * E1 §3.4 方案 A：交易类型徽标——页面层渲染（路径 1，HistoryItem 不动，
 * 不牵连 E3 OrderHistoryCard）。配色钉死真实 token（原型 v2 token 对照，
 * 原型 --success-bg/--warning-bg 是幽灵 token 已废）：
 *   deliveryFee → rider 图标（底 status-done-bg #e6f4ea / 图标 #137333）
 *   bonus       → gift 图标（底 warn-bg #fff3e0 / 图标 #e65100）
 *   withdrawal  → bank 图标（底 surface-container-high #fde2df / 图标 #59413d）
 * 图标色走 AppIcon color prop（colorByClass 不含 status/warn 系 token）。
 */
const txBadgeMeta: Record<EarningTransaction['type'], { icon: 'rider' | 'gift' | 'bank'; circleClass: string; iconColor: string; titleKey: TranslationKey }> = {
  deliveryFee: { icon: 'rider', circleClass: 'bg-status-done-bg', iconColor: '#137333', titleKey: 'earnings.tx.deliveryFee' },
  bonus: { icon: 'gift', circleClass: 'bg-warn-bg', iconColor: '#e65100', titleKey: 'earnings.tx.bonus' },
  withdrawal: { icon: 'bank', circleClass: 'bg-surface-container-high', iconColor: colors.textMuted, titleKey: 'earnings.tx.withdrawal' },
};

export default function EarningsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const goBack = useGoBack('/(main)/profile');
  // E1 §3.1 三态：移除 transactions `= []` 默认值（loading 与 empty 由 QueryBoundary 分流，
  // 不再混入「暂无交易」）
  const { data: summary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useEarningSummary();
  const { data: transactions, isLoading: txLoading, isError: txError, refetch: refetchTx } = useEarningTransactions();
  const [billingTab, setBillingTab] = useState<BillingTab>('today');

  // TODO: 后端按时间过滤；当前前端按 createdAt 是否在今天内筛选
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfYesterday = startOfDay - 24 * 60 * 60 * 1000;
  const currency = t('common.currency');

  const visibleTransactions = billingTab === 'today'
    ? (transactions ?? []).filter((tx) => new Date(tx.createdAt).getTime() >= startOfDay)
    : transactions ?? [];

  /**
   * E1 §3.3 日期分组：「全部账单」按 今日/昨日/更早 分组；「今日账单」单组
   * （全是今天，组头即区块标题）。transactions service 层已按 createdAt 降序，
   * 顺序遍历按桶收集即保持组内时序；降序遍历下组顺序天然是 今日→昨日→更早。
   */
  const groups: (TxGroup & { label: string })[] = [];
  if (billingTab === 'today') {
    groups.push({ key: 'today', label: t('earnings.today'), items: visibleTransactions });
  } else {
    let todayGroup: TxGroup | null = null;
    let yesterdayGroup: TxGroup | null = null;
    let earlierGroup: TxGroup | null = null;
    for (const tx of visibleTransactions) {
      const ts = new Date(tx.createdAt).getTime();
      if (ts >= startOfDay) {
        todayGroup ??= { key: 'today', items: [] };
        todayGroup.items.push(tx);
      } else if (ts >= startOfYesterday) {
        yesterdayGroup ??= { key: 'yesterday', items: [] };
        yesterdayGroup.items.push(tx);
      } else {
        earlierGroup ??= { key: 'earlier', items: [] };
        earlierGroup.items.push(tx);
      }
    }
    if (todayGroup) groups.push({ ...todayGroup, label: t('earnings.today') });
    if (yesterdayGroup) groups.push({ ...yesterdayGroup, label: t('common.yesterday') });
    if (earlierGroup) groups.push({ ...earlierGroup, label: t('common.earlier') });
  }

  /** E1 §3.5：按 tx.type 生成 i18n 描述（替代 mock 英文 description 直出） */
  const txTitle = (tx: EarningTransaction): string => {
    if (tx.type === 'deliveryFee') {
      // orderId 可选：无单号退化为占位 —（mock withdrawal 之外的 real 数据兜底）
      return t('earnings.tx.deliveryFee', { orderId: tx.orderId ?? '—' });
    }
    return t(txBadgeMeta[tx.type].titleKey);
  };

  return (
    <View className="flex-1 bg-background">
      <View className="relative flex-row items-center justify-center px-5 pb-4 pt-6">
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} className="absolute left-5 h-10 w-10 items-center justify-center rounded-full active:bg-surface-variant" onPress={() => void goBack()}>
          <AppIcon className="text-2xl text-on-surface" name="chevronLeft" size={28} />
        </Pressable>
        <Text className="text-2xl font-bold text-on-surface">{t('earnings.title')}</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-24">
        {/* E1 §3.1.A：summary 三态（summary 骨架变体）。isEmpty 恒 false——
            summary 是单对象非数组（mock 恒返 defaultSummary），走 loading/error/data 三分支 */}
        <QueryBoundary<EarningSummary>
          data={summary}
          isLoading={summaryLoading}
          isError={summaryError}
          isEmpty={() => false}
          errorTitle={t('common.loadError.title')}
          errorMessage={t('common.loadError.desc')}
          retryLabel={t('common.retry')}
          emptyTitle={t('earnings.title')}
          skeleton="summary"
          onRetry={() => void refetchSummary()}
        >
          {(s) => (
            <EarningCard
              balance={formatCurrency(s.availableBalance, currency)}
              balanceLabel={t('earnings.balanceLabel')}
              depositAmount={formatCurrency(s.todayEarnings, currency)}
              depositLabel={t('earnings.deposit')}
              paidLabel={t('earnings.paid')}
              unsettledLabel={t('earnings.unsettled')}
            />
          )}
        </QueryBoundary>

        <View className="mt-6">
          <Button className="h-12 bg-primary-container" onPress={() => router.push('/earnings/withdraw')}>
            {t('earnings.withdraw')}
          </Button>
        </View>

        <View className="mt-8">
          <View className="mb-4 flex-row border-b border-surface-container-high">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('earnings.todayBilling')}
              accessibilityState={{ selected: billingTab === 'today' }}
              className={`border-b-2 px-1 pb-2 ${billingTab === 'today' ? 'border-primary' : 'border-transparent'}`}
              onPress={() => setBillingTab('today')}
            >
              <Text className={`text-xl font-semibold ${billingTab === 'today' ? 'text-primary' : 'text-on-surface-variant'}`}>{t('earnings.todayBilling')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('earnings.allBilling')}
              accessibilityState={{ selected: billingTab === 'all' }}
              className={`ml-6 border-b-2 px-1 pb-2 ${billingTab === 'all' ? 'border-primary' : 'border-transparent'}`}
              onPress={() => setBillingTab('all')}
            >
              <Text className={`text-xl font-semibold ${billingTab === 'all' ? 'text-primary' : 'text-on-surface-variant'}`}>{t('earnings.allBilling')}</Text>
            </Pressable>
          </View>

          {/* E1 §3.1.B：transactions 三态（list 骨架 + 独立 error 重试 + isEmpty 空态） */}
          <QueryBoundary<EarningTransaction[]>
            data={visibleTransactions}
            isLoading={txLoading}
            isError={txError}
            isEmpty={(list) => list.length === 0}
            errorTitle={t('common.loadError.title')}
            errorMessage={t('common.loadError.desc')}
            retryLabel={t('common.retry')}
            emptyTitle={t('earnings.noTransactions')}
            skeleton="list"
            onRetry={() => void refetchTx()}
          >
            {() => (
              <View className="gap-4">
                {/* E1 §3.2：区块标题随 tab 动态（today→「今日」/ all→「全部账单」），
                    修原 :80 写死 earnings.today、切「全部」仍显「今日」bug */}
                <Text className="pt-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  {billingTab === 'today' ? t('earnings.today') : t('earnings.allBilling')}
                </Text>
                {groups.map((group, groupIndex) => (
                  <View key={group.key}>
                    {/* 「全部账单」多分组时组头标注今日/昨日/更早；第一组头与区块标题
                        同文案（今日）会重复——单分组不叠头，多分组从第二组起显示组头 */}
                    {groups.length > 1 && groupIndex > 0 ? (
                      <Text className="pb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">{group.label}</Text>
                    ) : null}
                    {group.items.map((tx) => {
                      const meta = txBadgeMeta[tx.type];
                      return (
                        <HistoryItem
                          key={tx.id}
                          amount={formatCurrency(tx.amount, currency, { sign: true })}
                          icon={{ name: meta.icon, circleClass: meta.circleClass, color: meta.iconColor, label: txTitle(tx) }}
                          positive={tx.amount >= 0}
                          time={new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          title={txTitle(tx)}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            )}
          </QueryBoundary>
        </View>
      </ScrollView>
    </View>
  );
}
