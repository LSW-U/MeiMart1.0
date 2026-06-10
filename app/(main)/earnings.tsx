import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { EarningCard } from '../../src/components/business/EarningCard';
import { HistoryItem } from '../../src/components/business/HistoryItem';
import { Button } from '../../src/components/ui';
import { useTranslation } from '../../src/i18n/useTranslation';

export default function EarningsPage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View className="flex-1 bg-[#fff8f7]">
      <View className="relative flex-row items-center justify-center px-5 pb-4 pt-6">
        <Pressable className="absolute left-5 h-10 w-10 items-center justify-center rounded-full active:bg-[#f7ddd9]" onPress={() => router.back()}>
          <Text className="text-2xl text-[#261816]">‹</Text>
        </Pressable>
        <Text className="text-2xl font-bold text-[#261816]">{t('earnings.title')}</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-24">
        <EarningCard
          balance={t('earnings.balance')}
          balanceLabel={t('earnings.balanceLabel')}
          depositAmount={t('earnings.depositAmount')}
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
            <HistoryItem amount={t('earnings.amount.plus1250')} positive time={t('earnings.time.1430')} title={t('earnings.tx.delivery1023')} />
            <HistoryItem amount={t('earnings.amount.minus100')} time={t('earnings.time.0915')} title={t('earnings.tx.withdrawal')} />
            <HistoryItem amount={t('earnings.amount.plus820')} positive time={t('earnings.time.0845')} title={t('earnings.tx.delivery1021')} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
