import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { EarningCard } from '../../src/components/business/EarningCard';
import { HistoryItem } from '../../src/components/business/HistoryItem';
import { AppIcon, Button } from '../../src/components/ui';
import { useGoBack } from '../../src/hooks/useGoBack';
import { useTranslation } from '../../src/i18n/useTranslation';
import { useEarningSummary, useEarningTransactions } from '../../src/services/queries/useEarnings';
import { formatCurrency } from '../../src/utils/format';
import { useState } from 'react';

type BillingTab = 'today' | 'all';

export default function EarningsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const goBack = useGoBack('/(main)/profile');
  const { data: summary } = useEarningSummary();
  const { data: transactions = [] } = useEarningTransactions();
  const [billingTab, setBillingTab] = useState<BillingTab>('today');

  // TODO: 后端按时间过滤；当前前端按 createdAt 是否在今天内筛选
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const currency = t('common.currency');

  const visibleTransactions = billingTab === 'today'
    ? transactions.filter((tx) => new Date(tx.createdAt).getTime() >= startOfDay)
    : transactions;

  return (
    <View className="flex-1 bg-surface">
      <View className="relative flex-row items-center justify-center px-5 pb-4 pt-6">
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} className="absolute left-5 h-10 w-10 items-center justify-center rounded-full active:bg-surface-variant" onPress={() => void goBack()}>
          <AppIcon className="text-2xl text-on-surface" name="chevronLeft" size={28} />
        </Pressable>
        <Text className="text-2xl font-bold text-on-surface">{t('earnings.title')}</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-24">
        <EarningCard
          balance={summary ? formatCurrency(summary.availableBalance, currency) : '—'}
          balanceLabel={t('earnings.balanceLabel')}
          depositAmount={summary ? formatCurrency(summary.todayEarnings, currency) : '—'}
          depositLabel={t('earnings.deposit')}
          paidLabel={t('earnings.paid')}
          unsettledLabel={t('earnings.unsettled')}
        />

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

          <View className="gap-4">
            <Text className="pt-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">{t('earnings.today')}</Text>
            {visibleTransactions.length === 0 ? (
              <Text className="py-4 text-center text-sm text-outline">{t('earnings.noTransactions')}</Text>
            ) : (
              visibleTransactions.map((tx) => (
                <HistoryItem
                  key={tx.id}
                  amount={formatCurrency(tx.amount, currency, { sign: true })}
                  positive={tx.amount >= 0}
                  time={new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  title={tx.description}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
