import { Pressable, Text, View } from 'react-native';

import { Button } from '../ui';
import { AppIcon } from '../ui/AppIcon';
import { showToast } from '../feedback/Toast';
import { useTranslation } from '../../i18n/useTranslation';
import { colors } from '../../theme/colors';

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
  /** T6 §7.7：联系按钮尾号展示（如「尾号4072」，无电话不传 → 按钮降级描边灰 + toast） */
  contactSuffix?: string;
  variant?: 'new' | 'active';
  onAction?: () => void;
  onChat?: () => void;
  onContact?: () => void;
};

// T6 §7.5 A：默认值收紧空字符串，强制调用方传 t() 本地化 label（英文默认值不再兜底）
export function TaskCard({ badge, timeLabel, timeTone = 'default', fee, feeNote, orderId, points, tags = [], items, note, actionLabel, actionPending = false, actionDisabled = false, chatLabel = '', contactLabel = '', contactSuffix, variant = 'new', onAction, onChat, onContact }: TaskCardProps) {
  const { t } = useTranslation();
  // T6 §7.1 A：无电话时按钮可见但降级（描边灰 + opacity），点击 toast 提示原因
  const hasContact = contactSuffix !== undefined;
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={items}
              className="rounded-lg bg-accent-amber px-2 py-1"
              onPress={() => showToast(items, 'info')}
            >
              <View className="flex-row items-center gap-1">
                <Text className="text-sm text-white">{items}</Text>
                {/* T6 §7.6 A：chevronDown 暗示展开实为 toast，改 info「查看」语义 */}
                <AppIcon name="info" className="text-sm text-white" size={14} />
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
        // T6 §7.7 A：主行动全宽主按钮 + 次要行（联系拨号｜聊天 toast 占位），
        // 对齐原型 tc-actions-v2（flex-col gap-8px）——联系/聊天是次要手段，不再与主 CTA 抢一行
        <View className="mt-1 flex-col gap-2">
          <Button
            accessibilityLabel={actionLabel}
            className="w-full"
            disabled={actionDisabled || actionPending}
            onPress={onAction}
          >
            {actionLabel}
          </Button>
          <View className="flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={contactLabel}
              accessibilityHint={hasContact ? t('tasks.callCustomer') : t('tasks.noPhone')}
              className={`flex-1 flex-row items-center justify-center gap-1 rounded-lg border py-2.5 ${hasContact ? 'border-primary-container bg-surface-container-low' : 'border-outline-variant opacity-50'}`}
              onPress={() => (onContact ? onContact() : showToast(t('tasks.noPhone'), 'info'))}
            >
              <AppIcon name="phone" size={16} color={hasContact ? colors.primary : colors.textMuted} />
              <Text className={`text-xs font-bold ${hasContact ? 'text-primary-container' : 'text-neutral-muted'}`}>
                {hasContact ? `${contactLabel} ${contactSuffix}` : contactLabel}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={chatLabel}
              accessibilityHint={t('tasks.chatComingSoon')}
              className="flex-1 flex-row items-center justify-center gap-1 rounded-lg border border-outline-variant bg-surface-container-low py-2.5"
              onPress={() => (onChat ? onChat() : showToast(t('tasks.chatComingSoon'), 'info'))}
            >
              <AppIcon name="sms" size={16} color={colors.textMuted} />
              <Text className="text-xs font-bold text-neutral-muted">{chatLabel}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Button className="mt-1 bg-primary-container" textClassName="text-xl" onPress={onAction}>{actionLabel}</Button>
      )}
    </View>
  );
}
