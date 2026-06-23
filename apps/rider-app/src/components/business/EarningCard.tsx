import { Text, View } from 'react-native';

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
    <View className="gap-2 rounded-lg bg-[#fff0ee] p-6 shadow-sm">
      <View className="flex-row items-center justify-between">
        <Text className="text-base text-[#961813]">{balanceLabel}</Text>
        <Text className="text-[#961813]">V</Text>
      </View>
      <Text className="py-2 text-[40px] font-bold leading-none tracking-tight text-[#961813]">{balance}</Text>
      <Text className="text-sm text-[#961813]">{unsettledLabel}</Text>
      <View className="my-2 h-px bg-[#961813]/20" />
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-[#961813]">{depositLabel}</Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-lg font-bold text-[#961813]">{depositAmount}</Text>
          <Text className="rounded-full bg-[#ffdea3] px-2 py-0.5 text-xs font-bold text-[#5d4200]">{paidLabel}</Text>
        </View>
      </View>
    </View>
  );
}
