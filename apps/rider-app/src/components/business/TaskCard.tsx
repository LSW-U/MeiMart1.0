import { Pressable, Text, View } from 'react-native';

import { Button } from '../ui';
import { showToast } from '../feedback/Toast';

type RoutePoint = {
  label: 'P' | 'D';
  title: string;
  subtitle?: string;
  distance?: string;
};

type TaskCardProps = {
  badge?: string;
  timeLabel: string;
  fee?: string;
  feeNote?: string;
  orderId?: string;
  points: RoutePoint[];
  tags?: string[];
  items?: string;
  note?: string;
  actionLabel: string;
  chatLabel?: string;
  contactLabel?: string;
  variant?: 'new' | 'active';
  onAction?: () => void;
  onChat?: () => void;
  onContact?: () => void;
};

export function TaskCard({ badge, timeLabel, fee, feeNote, orderId, points, tags = [], items, note, actionLabel, chatLabel = 'Chat', contactLabel = 'Contact', variant = 'new', onAction, onChat, onContact }: TaskCardProps) {
  return (
    <View className="relative gap-3 rounded-lg border border-[#f7ddd9] bg-white p-4 shadow-sm">
      {badge ? (
        <View className="absolute -left-2 -top-2 z-10 rounded-sm border border-[#720003] bg-white px-2 py-1 shadow-sm">
          <Text className="text-[10px] font-bold text-[#720003]">{badge}</Text>
        </View>
      ) : null}

      <View className="flex-row items-start justify-between pt-1">
        <View className="flex-1 pr-3">
          <Text className="text-lg font-semibold text-[#634700]">◷ {timeLabel}</Text>
          {orderId ? <Text className="mt-1 self-start rounded bg-[#ffe9e6] px-2 py-1 text-xs font-bold text-[#59413d]">{orderId}</Text> : null}
        </View>
        {fee ? (
          <View className="items-end">
            <Text className="text-xl font-bold text-[#720003]">{fee}</Text>
            {feeNote ? <Text className="mt-1 max-w-36 text-right text-xs font-bold uppercase tracking-wider text-[#59413d]">{feeNote}</Text> : null}
          </View>
        ) : null}
      </View>

      <View className="h-px bg-[#f7ddd9]" />

      <View className="relative gap-3">
        <View className="absolute bottom-6 left-[11px] top-6 w-0.5 bg-[#f7ddd9]" />
        {points.map((point) => (
          <View className="relative z-10 flex-row gap-2" key={`${point.label}-${point.title}`}>
            <View className={`mt-1 h-6 w-6 items-center justify-center rounded-full ${point.label === 'P' ? 'bg-[#e2e3e2]' : 'bg-[#634700]'}`}>
              <Text className={`text-[10px] font-bold ${point.label === 'P' ? 'text-[#636565]' : 'text-[#deb769]'}`}>{point.label}</Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-start justify-between gap-2">
                <Text className="flex-1 text-base font-bold text-[#261816]">{point.title}</Text>
                {point.distance ? <Text className="text-sm text-[#5d5f5f]">{point.distance}</Text> : null}
              </View>
              {point.subtitle ? <Text className="mt-1 text-sm text-[#59413d]">{point.subtitle}</Text> : null}
            </View>
          </View>
        ))}
      </View>

      {tags.length || items ? (
        <View className="flex-row flex-wrap gap-2">
          {tags.map((tag) => (
            <Text className="rounded border border-[#e1bfba] px-2 py-1 text-[11px] text-[#5d5f5f]" key={tag}>{tag}</Text>
          ))}
          {items ? (
            <Pressable className="rounded-lg bg-[#f59e0b] px-2 py-1" onPress={() => showToast(items, 'info')}>
              <Text className="text-sm text-white">{items} ˅</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {note ? (
        <View className="rounded border border-[#ffe0b2] bg-[#fff3e0] p-2">
          <Text className="text-sm text-[#e65100]">{note}</Text>
        </View>
      ) : null}

      {variant === 'active' ? (
        <View className="mt-1 flex-row items-stretch gap-2">
          <Pressable
            className="min-w-16 items-center justify-center rounded-lg border border-[#e1bfba] px-3"
            onPress={() => (onChat ? onChat() : showToast('Chat feature coming soon', 'info'))}
          >
            <Text className="text-xs font-bold text-[#261816]">{chatLabel}</Text>
          </Pressable>
          <Pressable
            className="flex-1 items-center justify-center rounded-lg border border-[#e1bfba] py-3"
            onPress={() => (onContact ? onContact() : showToast('Contact feature coming soon', 'info'))}
          >
            <Text className="text-sm font-bold text-[#261816]">{contactLabel}</Text>
          </Pressable>
          <Pressable className="flex-[2] items-center justify-center rounded-lg bg-[#961813] py-3" onPress={onAction}>
            <Text className="text-sm font-bold text-white">{actionLabel}</Text>
          </Pressable>
        </View>
      ) : (
        <Button className="mt-1 bg-[#961813]" textClassName="text-xl" onPress={onAction}>{actionLabel}</Button>
      )}
    </View>
  );
}
