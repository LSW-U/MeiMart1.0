import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { TaskCard } from '../../../src/components/business/TaskCard';
import { TaskDetailHeader } from '../../../src/components/business/TaskDetailHeader';
import { EmptyState } from '../../../src/components/feedback/EmptyState';
import { AppIcon } from '../../../src/components/ui';
import { useGoBack } from '../../../src/hooks/useGoBack';
import { useTranslation } from '../../../src/i18n/useTranslation';
import { useTaskStore } from '../../../src/store/useTaskStore';
import type { DeliveryTask } from '../../../src/types/task';

const formatDistance = (distanceKm: number) => `${distanceKm.toFixed(1)}km`;

export default function TaskOngoingPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const goBack = useGoBack('/(main)/tasks');
  const [task, setTask] = useState<DeliveryTask | null>(null);

  const loadTask = useCallback(async () => {
    const result = await useTaskStore.getState().getById(id);
    setTask(result);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 原因：B 阶段接入 React Query 后用 useQuery 替代，effect 加载模式自然消失
    void loadTask();
  }, [loadTask]);

  return (
    <View className="flex-1 bg-[#fff8f7]">
      <TaskDetailHeader
        activeTab="deliveries"
        deliveriesLabel={task ? t('tasks.tabs.deliveries1') : t('tasks.tabs.deliveries0')}
        dutyStatus="onDuty"
        dutyStatusLabel={t('duty.onDuty')}
        newTasksLabel={t('tasks.tabs.new')}
        pickupsLabel={t('tasks.tabs.pickups0')}
        onDutyPress={() => void goBack()}
        onMenuPress={() => void goBack()}
      />
      <ScrollView className="flex-1" contentContainerClassName="bg-white px-5 py-8 pb-28">
        {task ? (
          <>
            <TaskCard
              actionLabel={t('tasks.arrivedDelivery')}
              chatLabel={t('tasks.chat')}
              contactLabel={t('tasks.contact')}
              note={task.note}
              orderId={task.orderId.replace('JD Delivery ', '')}
              points={[
                { label: 'P', title: task.pickup.title, subtitle: task.pickup.address },
                { label: 'D', title: task.dropoff.title, subtitle: t('common.fromPickup', { distance: formatDistance(task.distanceKm) }) },
              ]}
              tags={[t('tasks.tag.callOnArrival'), t('tasks.tag.doNotLeave'), t('tasks.tag.express')]}
              timeLabel={t('common.remaining', { minutes: String(task.estimatedMinutes) })}
              variant="active"
              onAction={() => router.push(`/task/${id}/sign`)}
            />
            <View className="mt-3">
              <Text className="text-sm text-[#59413d]">
                {t('tasks.recipientSuffix')} <Text className="font-bold text-[#ff9800]">{task.dropoff.contactPhone?.slice(-4) ?? t('tasks.recipientSuffixValue')}</Text>
              </Text>
            </View>
          </>
        ) : (
          <EmptyState title={t('common.taskNotFound')} description={t('common.deliveryCompletedDesc')} />
        )}
      </ScrollView>
      <View className="absolute bottom-0 left-0 right-0 flex-row items-center gap-4 border-t border-[#f7ddd9] bg-[#fff8f7] px-3 py-4">
        <Pressable className="items-center px-2" onPress={() => router.push('/settings')}>
          <AppIcon name="settings" className="text-2xl text-[#59413d]" />
          <Text className="mt-1 text-[10px] font-bold text-[#59413d]">{t('tasks.settings')}</Text>
        </Pressable>
        <Pressable className="flex-1 flex-row items-center justify-center gap-2 rounded-full border border-[#e1bfba] bg-white py-4 shadow-sm" onPress={() => void loadTask()}>
          <AppIcon name="refresh" className="text-xl text-[#961813]" />
          <Text className="text-base font-bold text-[#961813]">{t('tasks.refresh')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
