import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { TaskCard } from '../../src/components/business/TaskCard';
import { TaskDetailHeader } from '../../src/components/business/TaskDetailHeader';
import { EmptyState } from '../../src/components/feedback/EmptyState';
import { useTranslation } from '../../src/i18n/useTranslation';
import { acceptTask, getTaskLists } from '../../src/services/task';
import type { DeliveryTask } from '../../src/types/task';

type TaskTab = 'new' | 'pickups' | 'deliveries';

type TaskLists = {
  available: DeliveryTask[];
  pickups: DeliveryTask[];
  deliveries: DeliveryTask[];
};

const emptyTaskLists: TaskLists = {
  available: [],
  pickups: [],
  deliveries: [],
};

const formatFee = (fee: number) => `¥${fee % 1 === 0 ? fee.toFixed(0) : fee.toFixed(1)}`;
const formatDistance = (distanceKm: number) => `${distanceKm.toFixed(1)}km`;
const formatItems = (items: string[]) => `Items: ${items.join(' · ')}`;

export default function TasksPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TaskTab>('new');
  const [online, setOnline] = useState(true);
  const [taskLists, setTaskLists] = useState<TaskLists>(emptyTaskLists);

  const loadTasks = async () => {
    setTaskLists(await getTaskLists());
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  const acceptAndOpenTask = async (task: DeliveryTask) => {
    await acceptTask(task.id);
    await loadTasks();
    router.push(`/task/${task.id}`);
  };

  const renderNewTask = (task: DeliveryTask, index: number) => (
    <TaskCard
      key={task.id}
      actionLabel={t('tasks.accept')}
      badge={index === 0 ? t('tasks.reward.firstOrder') : undefined}
      fee={formatFee(task.fee)}
      feeNote={index === 0 ? t('tasks.feeNote') : undefined}
      items={task.items.length ? formatItems(task.items) : undefined}
      note={task.note}
      points={[
        { label: 'P', title: task.pickup.title, subtitle: task.pickup.address, distance: formatDistance(Math.max(task.distanceKm - 1.3, 0.5)) },
        { label: 'D', title: task.dropoff.title, distance: formatDistance(task.distanceKm) },
      ]}
      tags={index === 0 ? [t('tasks.tag.express')] : []}
      timeLabel={`Deliver within ${task.estimatedMinutes} min`}
      onAction={() => void acceptAndOpenTask(task)}
    />
  );

  const renderPickupTask = (task: DeliveryTask) => (
    <TaskCard
      key={task.id}
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
      onAction={() => router.push(`/task/${task.id}/pickup`)}
    />
  );

  const renderDeliveryTask = (task: DeliveryTask) => (
    <TaskCard
      key={task.id}
      actionLabel={t('tasks.arrivedDelivery')}
      chatLabel={t('tasks.chat')}
      contactLabel={t('tasks.contact')}
      note={task.dropoff.contactPhone ? `${t('tasks.recipientSuffix')} ${task.dropoff.contactPhone.slice(-4)}` : task.note}
      orderId={task.orderId.replace('JD Delivery ', '')}
      points={[
        { label: 'P', title: task.pickup.title, distance: `${formatDistance(Math.max(task.distanceKm - 1.3, 0.5))} from here` },
        { label: 'D', title: task.dropoff.title, distance: `${formatDistance(task.distanceKm)} from pickup` },
      ]}
      tags={[t('tasks.tag.callOnArrival'), t('tasks.tag.doNotLeave')]}
      timeLabel={`Remaining ${task.estimatedMinutes} min`}
      variant="active"
      onAction={() => router.push(`/task/${task.id}/sign`)}
    />
  );

  const renderContent = () => {
    if (!online) {
      return <EmptyState title="You are offline" description="Switch On Duty back on to receive nearby delivery tasks." />;
    }

    if (activeTab === 'new') {
      return taskLists.available.length ? taskLists.available.map(renderNewTask) : <EmptyState title="No new tasks" description="Pull to refresh or wait for nearby orders." />;
    }

    if (activeTab === 'pickups') {
      return taskLists.pickups.length ? taskLists.pickups.map(renderPickupTask) : <EmptyState title="No pickups" description="Accepted tasks will appear here before merchant pickup." />;
    }

    return taskLists.deliveries.length ? taskLists.deliveries.map(renderDeliveryTask) : <EmptyState title="No deliveries" description="Picked-up orders will appear here until completion." />;
  };

  return (
    <View className="flex-1 bg-white">
      <TaskDetailHeader
        activeTab={activeTab}
        deliveriesLabel={taskLists.deliveries.length ? t('tasks.tabs.deliveries1') : t('tasks.tabs.deliveries0')}
        newTasksLabel={t('tasks.tabs.new')}
        online={online}
        onDutyLabel={t('tasks.status.onDuty')}
        pickupsLabel={taskLists.pickups.length ? t('tasks.tabs.pickups1') : t('tasks.tabs.pickups0')}
        onDutyToggle={() => setOnline((value) => !value)}
        onTabChange={setActiveTab}
      />
      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-3 py-6 pb-28">
        {renderContent()}
      </ScrollView>
      <View className="absolute bottom-0 left-0 right-0 flex-row items-center gap-4 border-t border-[#f7ddd9] bg-[#fff8f7] px-3 py-4">
        <Pressable className="items-center px-2">
          <Text className="text-2xl text-[#59413d]">S</Text>
          <Text className="mt-1 text-[10px] font-bold text-[#59413d]">{t('tasks.settings')}</Text>
        </Pressable>
        <Pressable className="flex-1 flex-row items-center justify-center gap-1 rounded-full border border-[#e1bfba] bg-white py-4 shadow-sm" onPress={() => void loadTasks()}>
          <Text className="text-xl text-[#961813]">R</Text>
          <Text className="text-base font-bold text-[#961813]">{t('tasks.refresh')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
