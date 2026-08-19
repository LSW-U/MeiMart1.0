import { Pressable, Text, View } from 'react-native';

import { Button } from '../ui';
import { AppIcon } from '../ui/AppIcon';
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
  /** T2 审查 P3-1：终态卡片 time 显示状态文本（已送达/配送失败）+ 中性/错误色（原型终态 tcard-time 无 clock 图标语义） */
  timeTone?: 'default' | 'neutral' | 'error';
  fee?: string;
  feeNote?: string;
  orderId?: string;
  points: RoutePoint[];
  tags?: string[];
  items?: string;
  note?: string;
  actionLabel: string;
  /** B1: active variant 主 action 的 pending/disabled（调用方透传 mutation 状态，如 acceptTask.isPending） */
  actionPending?: boolean;
  actionDisabled?: boolean;
  chatLabel?: string;
  contactLabel?: string;
  variant?: 'new' | 'active';
  onAction?: () => void;
  onChat?: () => void;
  onContact?: () => void;
};

export function TaskCard({ badge, timeLabel, timeTone = 'default', fee, feeNote, orderId, points, tags = [], items, note, actionLabel, actionPending = false, actionDisabled = false, chatLabel = 'Chat', contactLabel = 'Contact', variant = 'new', onAction, onChat, onContact }: TaskCardProps) {
  // T2 审查 P3-1：default=进行中（tertiary-container+clock）/ neutral=已送达（outline，原型 --neutral 同值）/ error=配送失败
  const timeTextClass = timeTone === 'error' ? 'text-error' : timeTone === 'neutral' ? 'text-outline' : 'text-tertiary-container';
  return (
    <View className="relative gap-3 rounded-lg border border-surface-variant bg-surface p-4 shadow-sm">
      {badge ? (
        <View className="absolute -left-2 -top-2 z-10 rounded-sm border border-primary bg-surface px-2 py-1 shadow-sm">
          <Text className="text-[10px] font-bold text-primary">{badge}</Text>
        </View>
      ) : null}

      <View className="flex-row items-start justify-between pt-1">
        <View className="flex-1 pr-3">
          <View className="flex-row items-center gap-1">
            {timeTone === 'default' ? <AppIcon name="clock" className="text-lg text-tertiary-container" size={18} /> : null}
            <Text className={`text-lg font-semibold ${timeTextClass}`}>{timeLabel}</Text>
          </View>
          {orderId ? <Text className="mt-1 self-start rounded bg-surface-container px-2 py-1 text-xs font-bold text-on-surface-variant">{orderId}</Text> : null}
        </View>
        {fee ? (
          <View className="items-end">
            <Text className="text-xl font-bold text-primary">{fee}</Text>
            {feeNote ? <Text className="mt-1 max-w-36 text-right text-xs font-bold uppercase tracking-wider text-on-surface-variant">{feeNote}</Text> : null}
          </View>
        ) : null}
      </View>

      <View className="h-px bg-surface-variant" />

      <View className="relative gap-3">
        <View className="absolute bottom-6 left-[11px] top-6 w-0.5 bg-surface-variant" />
        {points.map((point) => (
          <View className="relative z-10 flex-row gap-2" key={`${point.label}-${point.title}`}>
            <View className={`mt-1 h-6 w-6 items-center justify-center rounded-full ${point.label === 'P' ? 'bg-neutral-bg' : 'bg-tertiary-container'}`}>
              <Text className={`text-[10px] font-bold ${point.label === 'P' ? 'text-neutral' : 'text-tier-gold'}`}>{point.label}</Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-start justify-between gap-2">
                <Text className="flex-1 text-base font-bold text-on-surface">{point.title}</Text>
                {point.distance ? <Text className="text-sm text-neutral-muted">{point.distance}</Text> : null}
              </View>
              {point.subtitle ? <Text className="mt-1 text-sm text-on-surface-variant">{point.subtitle}</Text> : null}
            </View>
          </View>
        ))}
      </View>

      {tags.length || items ? (
        <View className="flex-row flex-wrap gap-2">
          {tags.map((tag) => (
            <Text className="rounded border border-outline-variant px-2 py-1 text-[11px] text-neutral-muted" key={tag}>{tag}</Text>
          ))}
          {items ? (
            <Pressable className="rounded-lg bg-accent-amber px-2 py-1" onPress={() => showToast(items, 'info')}>
              <View className="flex-row items-center gap-1">
                <Text className="text-sm text-white">{items}</Text>
                <AppIcon name="chevronDown" className="text-sm text-white" size={14} />
              </View>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {note ? (
        <View className="rounded border border-warn-border bg-warn-bg p-2">
          <Text className="text-sm text-warn-text">{note}</Text>
        </View>
      ) : null}

      {variant === 'active' ? (
        <View className="mt-1 flex-row items-stretch gap-2">
          <Pressable
            className="min-w-16 items-center justify-center rounded-lg border border-outline-variant px-3"
            onPress={() => (onChat ? onChat() : showToast('Chat feature coming soon', 'info'))}
          >
            <Text className="text-xs font-bold text-on-surface">{chatLabel}</Text>
          </Pressable>
          <Pressable
            className="flex-1 items-center justify-center rounded-lg border border-outline-variant py-3"
            onPress={() => (onContact ? onContact() : showToast('Contact feature coming soon', 'info'))}
          >
            <Text className="text-sm font-bold text-on-surface">{contactLabel}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            accessibilityState={{ disabled: actionDisabled || actionPending, busy: actionPending }}
            className="flex-[2] items-center justify-center rounded-lg bg-primary-container py-3"
            disabled={actionDisabled || actionPending}
            onPress={onAction}
            // B1/审查 M1: opacity 走 style 不走 className，避免 Tailwind class 优先级不稳定（同 Button §3.7）
            style={{ opacity: actionDisabled || actionPending ? 0.5 : 1 }}
          >
            <Text className="text-sm font-bold text-white">{actionLabel}</Text>
          </Pressable>
        </View>
      ) : (
        <Button className="mt-1 bg-primary-container" textClassName="text-xl" onPress={onAction}>{actionLabel}</Button>
      )}
    </View>
  );
}
