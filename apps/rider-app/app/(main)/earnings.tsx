import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { EarningCard } from '../../src/components/business/EarningCard';
import { HistoryItem } from '../../src/components/business/HistoryItem';
import { Button } from '../../src/components/ui';
import { useGoBack } from '../../src/hooks/useGoBack';
import { useTranslation } from '../../src/i18n/useTranslation';
import { useEarningSummary, useEarningTransactions } from '../../src/services/queries/useEarnings';

export default function EarningsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const goBack = useGoBack('/(main)/profile');
  const { data: summary } = useEarningSummary();
  const { data: transactions = [] } = useEarningTransactions();

  const formatAmount = (amount: number) => (amount >= 0 ? `+${t('common.currency')}${amount.toFixed(2)}` : `-${t('common.currency')}${Math.abs(amount).toFixed(2)}`);

  return (
    <View className="flex-1 bg-[#fff8f7]">
      <View className="relative flex-row items-center justify-center px-5 pb-4 pt-6">
        <Pressable className="absolute left-5 h-10 w-10 items-center justify-center rounded-full active:bg-[#f7ddd9]" onPress={() => void goBack()}>
          <Text className="text-2xl text-[#261816]">‹</Text>
        </Pressable>
        <Text className="text-2xl font-bold text-[#261816]">{t('earnings.title')}</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-24">
        <EarningCard
          balance={summary ? `${t('common.currency')}${summary.availableBalance.toFixed(2)}` : '—'}
          balanceLabel={t('earnings.balanceLabel')}
          depositAmount={summary ? `${t('common.currency')}${summary.todayEarnings.toFixed(2)}` : '—'}
          depositLabel={t('earnings.deposit')}
          paidLabel={t('earnings.paid')}
          unsettledLabel={t('earnings.unsettled')}
        />

        <View className="mt-6">
          <Button className="h-12 bg-[#961813]" onPress={() => router.push('/earnings/withdraw')}>
            {t('earnings.withdraw')}
          </Button>
        </View>

        <View className="mt-8">
          <View className="mb-4 flex-row border-b border-[#fde2df]">
            <Pressable className="border-b-2 border-[#720003] px-1 pb-2">
              <Text className="text-xl font-semibold text-[#720003]">{t('earnings.todayBilling')}</Text>
            </Pressable>
            <Pressable className="ml-6 px-1 pb-2">
              <Text className="text-lg text-[#59413d]">{t('earnings.allBilling')}</Text>
            </Pressable>
          </View>

          <View className="gap-4">
            <Text className="pt-2 text-xs font-bold uppercase tracking-wider text-[#59413d]">{t('earnings.today')}</Text>
            {transactions.length === 0 ? (
              <Text className="py-4 text-center text-sm text-[#8d706c]">{t('earnings.noTransactions')}</Text>
            ) : (
              transactions.map((tx) => (
                <HistoryItem
                  key={tx.id}
                  amount={formatAmount(tx.amount)}
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
