import { Pressable, Text, View } from 'react-native';

type HistoryItemProps = {
  title: string;
  time: string;
  amount: string;
  positive?: boolean;
};

export function HistoryItem({ title, time, amount, positive = false }: HistoryItemProps) {
  return (
    <View className="flex-row items-center gap-4 border-b border-[#fde2df] py-2">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-[#fde2df]">
        <Text className="text-[#59413d]">{positive ? 'IN' : 'OUT'}</Text>
      </View>
      <View className="flex-1">
        <Text className="font-medium text-[#261816]">{title}</Text>
        <Text className="text-sm text-[#59413d]">{time}</Text>
      </View>
      <Text className={`text-lg font-bold ${positive ? 'text-[#720003]' : 'text-[#261816]'}`}>{amount}</Text>
    </View>
  );
}

type OrderHistoryCardProps = {
  status: string;
  statusTone: 'completed' | 'cancelled' | 'transferred';
  orderNo: string;
  time: string;
  pickupName: string;
  pickupAddress: string;
  dropoffName: string;
  dropoffAddress: string;
  incomeLabel: string;
  income: string;
  viewDetailsLabel: string;
  onPress?: () => void;
};

export function OrderHistoryCard({ status, statusTone, orderNo, time, pickupName, pickupAddress, dropoffName, dropoffAddress, incomeLabel, income, viewDetailsLabel, onPress }: OrderHistoryCardProps) {
  const badgeClass = statusTone === 'completed' ? 'bg-[#e6f4ea] text-[#137333]' : statusTone === 'cancelled' ? 'bg-[#e2e3e2] text-[#1a1c1c]' : 'bg-[#fef7e0] text-[#b06000]';
  const muted = statusTone === 'cancelled';

  return (
    <Pressable className="rounded-lg border border-[#f7ddd9] bg-white p-4 shadow-sm active:bg-[#fff0ee]" onPress={onPress}>
      <View className="mb-4 flex-row items-center justify-between border-b border-[#f7ddd9] pb-3">
        <View className="flex-row items-center gap-2">
          <Text className={`rounded-sm px-2 py-1 text-xs font-bold uppercase tracking-wide ${badgeClass}`}>{status}</Text>
          <Text className="text-sm font-bold text-[#59413d]">{orderNo}</Text>
        </View>
        <Text className="text-sm text-[#59413d]">{time}</Text>
      </View>
      <View className="relative mb-4 gap-4 pl-6">
        <View className="absolute bottom-2 left-[9px] top-2 w-px border-l-2 border-dashed border-[#e1bfba]" />
        <View className="relative">
          <View className={`absolute left-[-24px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-500 ${muted ? 'opacity-60' : ''}`} />
          <Text className={`mb-0.5 font-bold leading-tight text-[#261816] ${muted ? 'opacity-60' : ''}`}>{pickupName}</Text>
          <Text className={`text-sm leading-tight text-[#59413d] ${muted ? 'opacity-60' : ''}`}>{pickupAddress}</Text>
        </View>
        <View className="relative">
          <View className={`absolute left-[-24px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-orange-500 ${muted ? 'opacity-60' : ''}`} />
          <Text className={`mb-0.5 font-bold leading-tight text-[#261816] ${muted ? 'opacity-60' : ''}`}>{dropoffName}</Text>
          <Text className={`text-sm leading-tight text-[#59413d] ${muted ? 'opacity-60' : ''}`}>{dropoffAddress}</Text>
        </View>
      </View>
      <View className="flex-row items-center justify-between border-t border-[#f7ddd9] pt-3">
        <View>
          <Text className={`text-xs font-bold uppercase tracking-wider text-[#8d706c] ${muted ? 'opacity-60' : ''}`}>{incomeLabel}</Text>
          <Text className={`font-bold ${income.startsWith('$') ? 'text-[#720003]' : 'text-[#59413d]'}`}>{income}</Text>
        </View>
        <Text className="text-sm font-bold text-[#720003]">{viewDetailsLabel} ›</Text>
      </View>
    </Pressable>
  );
}
