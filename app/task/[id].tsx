import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { TaskCard } from '../../src/components/business/TaskCard';
import { TaskDetailHeader } from '../../src/components/business/TaskDetailHeader';
import { EmptyState } from '../../src/components/feedback/EmptyState';
import { AppIcon } from '../../src/components/ui';
import { useGoBack } from '../../src/hooks/useGoBack';
import { useTranslation } from '../../src/i18n/useTranslation';
import { getTaskById } from '../../src/services/task';
import type { DeliveryTask } from '../../src/types/task';

const formatDistance = (distanceKm: number) => `${distanceKm.toFixed(1)}km`;
const formatItems = (items: string[]) => `Items: ${items.join(' · ')}`;

export default function TaskDetailPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const goBack = useGoBack('/(main)/tasks');
  const [task, setTask] = useState<DeliveryTask | null>(null);

  useEffect(() => {
    void getTaskById(id).then(setTask);
  }, [id]);

  return (
    <View className="flex-1 bg-[#fff8f7]">
      <TaskDetailHeader
        activeTab="pickups"
        deliveriesLabel={t('tasks.tabs.deliveries0')}
        dutyStatus="onDuty"
        dutyStatusLabel={t('duty.onDuty')}
        newTasksLabel={t('tasks.tabs.new')}
        pickupsLabel={task ? t('tasks.tabs.pickups1') : t('tasks.tabs.pickups0')}
        onDutyPress={() => void goBack()}
        onMenuPress={() => void goBack()}
      />
      <ScrollView className="flex-1" contentContainerClassName="px-3 py-6 pb-28">
        {task ? (
          <TaskCard
            actionLabel={t('tasks.arrivedPickup')}
            chatLabel={t('tasks.chat')}
            contactLabel={t('tasks.contact')}
            items={task.items.length ? formatItems(task.items) : undefined}
            note={task.note}
            orderId={task.orderId}
            points={[
              { label: 'P', title: task.pickup.title, subtitle: task.pickup.address, distance: `${formatDistance(Math.max(task.distanceKm - 1.3, 0.5))} from here` },
              { label: 'D', title: task.dropoff.title, distance: `${formatDistance(task.distanceKm)} from pickup` },
            ]}
            timeLabel={`Remaining ${task.estimatedMinutes} min`}
            variant="active"
            onAction={() => router.push(`/task/${id}/pickup`)}
          />
        ) : (
          <EmptyState title="Task not found" description="This task may have been completed, cancelled, or reassigned." />
        )}
      </ScrollView>
      <View className="absolute bottom-0 left-0 right-0 flex-row items-center gap-4 border-t border-[#f7ddd9] bg-[#fff8f7] px-3 py-4">
        <Pressable className="items-center px-2" onPress={() => router.push('/settings')}>
          <AppIcon name="settings" className="text-2xl text-[#59413d]" />
          <Text className="mt-1 text-[10px] font-bold text-[#59413d]">{t('tasks.settings')}</Text>
        </Pressable>
        <Pressable className="flex-1 flex-row items-center justify-center gap-2 rounded-full border border-[#e1bfba] bg-white py-4 shadow-sm">
          <AppIcon name="refresh" className="text-xl text-[#961813]" />
          <Text className="text-base font-bold text-[#961813]">{t('tasks.refresh')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
