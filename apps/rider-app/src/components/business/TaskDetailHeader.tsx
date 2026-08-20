import type { ReactElement } from 'react';
import { colors } from "../../theme/colors";
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import type { DutyStatus } from '../../services/settings';
import { useUnreadCount } from '../../services/queries/useNotifications';
import { AppIcon } from '../ui';
import { useTranslation } from '../../i18n/useTranslation';

type TaskTab = 'new' | 'pickups' | 'deliveries';

type TaskDetailHeaderProps = {
  // T2 §3.2：tab 4 prop 改可选——详情页单任务视图不传（tab 行不渲染），
  // 列表页全传保持原行为。漏传任一 prop tab 行静默消失（渲染条件 && 全检兜底）
  activeTab?: TaskTab;
  dutyStatus: DutyStatus;
  dutyStatusLabel: string;
  newTasksLabel?: string;
  pickupsLabel?: string;
  deliveriesLabel?: string;
  onDutyPress?: () => void;
  onMenuPress?: () => void;
  onTabChange?: (tab: TaskTab) => void;
};

// A2 收口：busy 点专用 token bg-busy（原复用 transferred-text「已转单」取值，语义错位）
const dotColor: Record<DutyStatus, string> = {
  onDuty: 'bg-success-deep',
  busy: 'bg-busy',
  offDuty: 'bg-dot-off',
};

export function TaskDetailHeader({ activeTab, dutyStatus, dutyStatusLabel, newTasksLabel, pickupsLabel, deliveriesLabel, onDutyPress, onMenuPress, onTabChange }: TaskDetailHeaderProps) {
  const router = useRouter();
  const { data: unread = 0 } = useUnreadCount();
  const { t } = useTranslation();

  const tabs = [
    { key: 'new', label: newTasksLabel },
    { key: 'pickups', label: pickupsLabel },
    { key: 'deliveries', label: deliveriesLabel },
  ] as const;

  // T6 §7.4 A：onDutyPress 未传（详情页单任务视图）时 duty 区降级纯展示——
  // 不接 Pressable、隐藏 chevronDown（无展开语义），切班集中在列表页做
  const dutyArea: ReactElement =
    typeof onDutyPress === 'function' ? (
      <Pressable accessibilityRole="button" accessibilityLabel={dutyStatusLabel} className="flex-row items-center gap-2 rounded-full border border-primary-container bg-surface px-4 py-1" onPress={onDutyPress}>
        <View className={`h-2 w-2 rounded-full ${dotColor[dutyStatus]}`} />
        <Text className="text-xl font-bold text-on-surface">{dutyStatusLabel}</Text>
        <AppIcon name="chevronDown" color={colors.textMuted} size={18} />
      </Pressable>
    ) : (
      <View className="flex-row items-center gap-2 rounded-full border border-primary-container bg-surface px-4 py-1">
        <View className={`h-2 w-2 rounded-full ${dotColor[dutyStatus]}`} />
        <Text className="text-xl font-bold text-on-surface">{dutyStatusLabel}</Text>
      </View>
    );

  return (
    <View className="border-b border-surface-variant bg-surface-container px-5 pb-1 pt-2">
      <View className="h-12 flex-row items-center justify-between">
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.menu')} className="rounded-full p-1" onPress={onMenuPress}>
          <AppIcon name="menu" className="text-2xl text-on-surface-variant" />
        </Pressable>
        {dutyArea}
        <Pressable accessibilityRole="button" accessibilityLabel={t('notification.title')} accessibilityHint={unread > 0 ? t('notification.unreadCount', { count: unread }) : undefined} className="relative rounded-full p-1" onPress={() => router.push('/notifications')}>
          <AppIcon name="notification" className="text-2xl text-on-surface-variant" />
          {unread > 0 ? (
            <View className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface-container bg-dot-unread" />
          ) : null}
        </Pressable>
      </View>
      {activeTab && newTasksLabel && pickupsLabel && deliveriesLabel ? (
        <View className="mt-2 flex-row gap-6 border-b border-surface-variant">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable accessibilityRole="button" accessibilityLabel={tab.label} accessibilityState={{ selected: active }} className="pb-1" key={tab.key} onPress={() => onTabChange?.(tab.key)}>
                <Text className={`text-base font-semibold ${active ? 'text-primary-container' : 'text-on-surface-variant'}`}>{tab.label}</Text>
                {active ? <View className="mt-1 h-0.5 rounded-full bg-primary-container" /> : <View className="mt-1 h-0.5 rounded-full bg-transparent" />}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
