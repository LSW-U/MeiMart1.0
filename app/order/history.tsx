import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { OrderHistoryCard } from '../../src/components/business/HistoryItem';
import { useTranslation } from '../../src/i18n/useTranslation';

export default function OrderHistoryPage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View className="flex-1 bg-[#fff8f7]">
      <View className="flex-row items-center justify-between border-b border-[#f7ddd9] bg-[#fff8f7] px-4 py-4">
        <Pressable className="rounded-full p-2" onPress={() => router.back()}>
          <Text className="text-2xl text-[#261816]">‹</Text>
        </Pressable>
        <Text className="flex-1 pr-8 text-center text-2xl font-bold tracking-tight text-[#261816]">{t('history.title')}</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-md px-4 pb-28 pt-4">
        <Pressable className="mb-6 flex-row items-center justify-between rounded-lg border border-[#e1bfba] bg-white p-3 shadow-sm">
          <Text className="font-bold text-[#261816]">{t('history.date')}</Text>
          <Text className="text-[#8d706c]">CAL</Text>
        </Pressable>

        <View className="mb-6 flex-row gap-6 border-b border-[#f7ddd9] pb-1">
          <Text className="border-b-2 border-[#720003] px-1 pb-2 text-sm font-bold text-[#720003]">{t('history.tab.all')}</Text>
          <Text className="px-1 pb-2 text-sm text-[#59413d]">{t('history.tab.completed')}</Text>
          <Text className="px-1 pb-2 text-sm text-[#59413d]">{t('history.tab.cancelled')}</Text>
        </View>

        <View className="gap-4">
          <OrderHistoryCard
            dropoffAddress={t('history.dropoff.plazaAddress')}
            dropoffName={t('history.dropoff.plaza')}
            income={t('history.amount1250')}
            incomeLabel={t('history.income')}
            orderNo={t('history.order10239485')}
            pickupAddress={t('history.pickup.bakeryAddress')}
            pickupName={t('history.pickup.bakery')}
            status={t('history.status.completed')}
            statusTone="completed"
            time={t('history.time1030')}
            viewDetailsLabel={t('history.viewDetails')}
          />
          <OrderHistoryCard
            dropoffAddress={t('history.dropoff.financeAddress')}
            dropoffName={t('history.dropoff.finance')}
            income={t('history.noIncome')}
            incomeLabel={t('history.income')}
            orderNo={t('history.order10239486')}
            pickupAddress={t('history.pickup.cafeAddress')}
            pickupName={t('history.pickup.cafe')}
            status={t('history.status.cancelled')}
            statusTone="cancelled"
            time={t('history.time1115')}
            viewDetailsLabel={t('history.viewDetails')}
          />
          <OrderHistoryCard
            dropoffAddress={t('history.dropoff.untlAddress')}
            dropoffName={t('history.dropoff.untl')}
            income={t('history.noIncome')}
            incomeLabel={t('history.income')}
            orderNo={t('history.order10239487')}
            pickupAddress={t('history.pickup.litaAddress')}
            pickupName={t('history.pickup.lita')}
            status={t('history.status.transferred')}
            statusTone="transferred"
            time={t('history.time1345')}
            viewDetailsLabel={t('history.viewDetails')}
          />
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-[#e1bfba] bg-[#fde2df] px-4 py-4 shadow-sm">
        <View className="mx-auto flex-row w-full max-w-md items-center justify-between">
          <Text className="font-bold text-[#261816]">{t('history.todayOrders')}</Text>
          <Text className="text-xl font-bold text-[#720003]">{t('history.todayAmount')}</Text>
        </View>
      </View>
    </View>
  );
}
