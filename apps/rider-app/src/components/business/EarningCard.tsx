import { Text, View } from 'react-native';

import { AppIcon } from '../ui';

type EarningCardProps = {
  balanceLabel: string;
  balance: string;
  unsettledLabel: string;
  depositLabel: string;
  depositAmount: string;
  paidLabel: string;
};

export function EarningCard({ balanceLabel, balance, unsettledLabel, depositLabel, depositAmount, paidLabel }: EarningCardProps) {
  return (
    <View className="gap-2 rounded-lg bg-surface-container-low p-6 shadow-sm">
      <View className="flex-row items-center justify-between">
        <Text className="text-base text-primary-container">{balanceLabel}</Text>
        {/* B7: V 字符 → 已结算/可信标记（§7.1 A） */}
        <AppIcon className="text-primary-container" name="verified" size={18} />
      </View>
      <Text className="py-2 text-[40px] font-bold leading-none tracking-tight text-primary-container">{balance}</Text>
      <Text className="text-sm text-primary-container">{unsettledLabel}</Text>
      <View className="my-2 h-px bg-primary-container/20" />
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-primary-container">{depositLabel}</Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-lg font-bold text-primary-container">{depositAmount}</Text>
          <Text className="rounded-full bg-tier-gold-soft px-2 py-0.5 text-xs font-bold text-tier-gold-text">{paidLabel}</Text>
        </View>
      </View>
    </View>
  );
}
