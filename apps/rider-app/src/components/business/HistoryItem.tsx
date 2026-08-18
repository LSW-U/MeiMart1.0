import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '../ui';

type HistoryItemProps = {
  title: string;
  time: string;
  amount: string;
  positive?: boolean;
};

export function HistoryItem({ title, time, amount, positive = false }: HistoryItemProps) {
  return (
    <View className="flex-row items-center gap-4 border-b border-surface-container-high py-2">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
        {/* B7: IN/OUT 英文缩写 → 方向箭头（positive 与金额收入色对齐） */}
        <AppIcon className={positive ? 'text-primary' : 'text-on-surface-variant'} name={positive ? 'arrowUp' : 'arrowDown'} size={20} />
      </View>
      <View className="flex-1">
        <Text className="font-medium text-on-surface">{title}</Text>
        <Text className="text-sm text-on-surface-variant">{time}</Text>
      </View>
      <Text className={`text-lg font-bold ${positive ? 'text-primary' : 'text-on-surface'}`}>{amount}</Text>
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
  const badgeClass = statusTone === 'completed' ? 'bg-status-done-bg text-status-done-text' : statusTone === 'cancelled' ? 'bg-status-cancelled-bg text-status-cancelled-text' : 'bg-status-transferred-bg text-status-transferred-text';
  const muted = statusTone === 'cancelled';

  return (
    <Pressable className="rounded-lg border border-surface-variant bg-surface p-4 shadow-sm active:bg-surface-container-low" onPress={onPress}>
      <View className="mb-4 flex-row items-center justify-between border-b border-surface-variant pb-3">
        <View className="flex-row items-center gap-2">
          <Text className={`rounded-sm px-2 py-1 text-xs font-bold uppercase tracking-wide ${badgeClass}`}>{status}</Text>
          <Text className="text-sm font-bold text-on-surface-variant">{orderNo}</Text>
        </View>
        <Text className="text-sm text-on-surface-variant">{time}</Text>
      </View>
      <View className="relative mb-4 gap-4 pl-6">
        <View className="absolute bottom-2 left-[9px] top-2 w-px border-l-2 border-dashed border-outline-variant" />
        <View className="relative">
          {/* 审查 P2-1：pickup 点复用品牌色/dropoff 点复用 transferred 橙均为取值非语义；专用点位 token 待 Q6 第二步 */}
          <View className={`absolute left-[-24px] top-1.5 h-3 w-3 rounded-full border-2 border-surface bg-primary ${muted ? 'opacity-60' : ''}`} />
          <Text className={`mb-0.5 font-bold leading-tight text-on-surface ${muted ? 'opacity-60' : ''}`}>{pickupName}</Text>
          <Text className={`text-sm leading-tight text-on-surface-variant ${muted ? 'opacity-60' : ''}`}>{pickupAddress}</Text>
        </View>
        <View className="relative">
          <View className={`absolute left-[-24px] top-1.5 h-3 w-3 rounded-full border-2 border-surface bg-status-transferred-text ${muted ? 'opacity-60' : ''}`} />
          <Text className={`mb-0.5 font-bold leading-tight text-on-surface ${muted ? 'opacity-60' : ''}`}>{dropoffName}</Text>
          <Text className={`text-sm leading-tight text-on-surface-variant ${muted ? 'opacity-60' : ''}`}>{dropoffAddress}</Text>
        </View>
      </View>
      <View className="flex-row items-center justify-between border-t border-surface-variant pt-3">
        <View>
          <Text className={`text-xs font-bold uppercase tracking-wider text-outline ${muted ? 'opacity-60' : ''}`}>{incomeLabel}</Text>
          <Text className={`font-bold ${income.startsWith('$') ? 'text-primary' : 'text-on-surface-variant'}`}>{income}</Text>
        </View>
        <Text className="text-sm font-bold text-primary">{viewDetailsLabel} ›</Text>
      </View>
    </Pressable>
  );
}
