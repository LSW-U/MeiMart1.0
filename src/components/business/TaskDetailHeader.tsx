import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '../ui';

type TaskTab = 'new' | 'pickups' | 'deliveries';

type TaskDetailHeaderProps = {
  activeTab: TaskTab;
  onDutyLabel: string;
  newTasksLabel: string;
  pickupsLabel: string;
  deliveriesLabel: string;
  online?: boolean;
  onDutyToggle?: () => void;
  onMenuPress?: () => void;
  onTabChange?: (tab: TaskTab) => void;
};

export function TaskDetailHeader({ activeTab, onDutyLabel, newTasksLabel, pickupsLabel, deliveriesLabel, online = true, onDutyToggle, onMenuPress, onTabChange }: TaskDetailHeaderProps) {
  const tabs = [
    { key: 'new', label: newTasksLabel },
    { key: 'pickups', label: pickupsLabel },
    { key: 'deliveries', label: deliveriesLabel },
  ] as const;

  return (
    <View className="border-b border-[#f7ddd9] bg-[#ffe9e6] px-5 pb-1 pt-2">
      <View className="h-12 flex-row items-center justify-between">
        <Pressable className="rounded-full p-1" onPress={onMenuPress}>
          <AppIcon name="menu" className="text-2xl text-[#59413d]" />
        </Pressable>
        <Pressable className="flex-row items-center gap-2 rounded-full border border-[#961813] bg-[#fff8f7] px-4 py-1" onPress={onDutyToggle}>
          <View className={`h-2 w-2 rounded-full ${online ? 'bg-green-500' : 'bg-[#b9aaa7]'}`} />
          <Text className="text-xl font-bold text-[#261816]">{onDutyLabel}</Text>
          <Text className="text-[#59413d]">v</Text>
        </Pressable>
        <Pressable className="rounded-full p-1">
          <AppIcon name="notification" className="text-2xl text-[#59413d]" />
        </Pressable>
      </View>
      <View className="mt-2 flex-row gap-6 border-b border-[#f7ddd9]">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable className="pb-1" key={tab.key} onPress={() => onTabChange?.(tab.key)}>
              <Text className={`text-base font-semibold ${active ? 'text-[#961813]' : 'text-[#59413d]'}`}>{tab.label}</Text>
              {active ? <View className="mt-1 h-0.5 rounded-full bg-[#961813]" /> : <View className="mt-1 h-0.5 rounded-full bg-transparent" />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
