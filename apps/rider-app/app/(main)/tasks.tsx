import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DutyStatusMenu } from '../../src/components/business/DutyStatusMenu';
import { TaskCard } from '../../src/components/business/TaskCard';
import { TaskDetailHeader } from '../../src/components/business/TaskDetailHeader';
import { ConfirmDialog } from '../../src/components/feedback/ConfirmDialog';
import { EmptyState } from '../../src/components/feedback/EmptyState';
import { AppIcon, Button } from '../../src/components/ui';
import { useTranslation, type TranslationKey } from '../../src/i18n/useTranslation';
import { useTaskLists } from '../../src/services/queries/useTask';
import { dutyStatusOptions, type DutyStatus } from '../../src/services/settings';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useRiderStore } from '../../src/store/useRiderStore';
import type { DeliveryTask } from '../../src/types/task';

type TaskTab = 'new' | 'pickups' | 'deliveries';

const dutyLabelKey: Record<DutyStatus, 'duty.onDuty' | 'duty.offDuty' | 'duty.busy'> = {
  onDuty: 'duty.onDuty',
  offDuty: 'duty.offDuty',
  busy: 'duty.busy',
};

const formatFee = (fee: number, currency: string) => `${currency}${fee % 1 === 0 ? fee.toFixed(0) : fee.toFixed(1)}`;
const formatDistance = (distanceKm: number) => `${distanceKm.toFixed(1)}km`;
const formatItems = (items: string[], t: (key: TranslationKey, vars?: Record<string, string | number>) => string) => t('common.items', { items: items.join(' · ') });

export default function TasksPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TaskTab>(tabParam === 'pickups' ? 'pickups' : tabParam === 'deliveries' ? 'deliveries' : 'new');
  const [menuVisible, setMenuVisible] = useState(false);
  const [pending, setPending] = useState<DutyStatus | null>(null);
  const [blockVisible, setBlockVisible] = useState(false);

  const dutyStatus = useRiderStore((s) => s.status);
  const setDutyStatus = useRiderStore((s) => s.setDutyStatus);
  const hydrateRider = useRiderStore((s) => s.hydrate);
  const { data: taskListsData, refetch: refetchTasks } = useTaskLists();
  const taskLists = taskListsData ?? { available: [] as DeliveryTask[], pickups: [] as DeliveryTask[], deliveries: [] as DeliveryTask[] };
  const rider = useAuthStore((s) => s.rider);

  const online = dutyStatus !== 'offDuty';
  const bondPaid = rider?.bondPaid ?? true;
  const activeTasksExist = taskLists.pickups.length + taskLists.deliveries.length > 0;
  const currency = t('common.currency');

  useEffect(() => {
    let unsubRider: (() => void) | undefined;
    void hydrateRider().then((fn) => { unsubRider = fn; });
    return () => { unsubRider?.(); };
  }, [hydrateRider]);

  const openMenu = () => setMenuVisible(true);

  const handlePick = async (next: DutyStatus) => {
    if (next === dutyStatus) {
      setMenuVisible(false);
      return;
    }
    if (next === 'offDuty' && (dutyStatus === 'onDuty' || dutyStatus === 'busy')) {
      // 用派生数据判断是否有进行中任务（useTaskLists 缓存已含最新状态，无需后端再确认）
      if (activeTasksExist) {
        setMenuVisible(false);
        setBlockVisible(true);
        return;
      }
    }
    setMenuVisible(false);
    setPending(next);
  };

  const confirmPending = async () => {
    if (!pending) return;
    await setDutyStatus(pending);
    setPending(null);
  };

  const menuOptions = useMemo(
    () =>
      dutyStatusOptions.map((value) => ({
        value,
        label: t(dutyLabelKey[value]),
        disabled: value === 'offDuty' && dutyStatus !== 'offDuty' && activeTasksExist,
      })),
    [activeTasksExist, dutyStatus, t],
  );

  const renderNewTask = (task: DeliveryTask, index: number) => (
    <TaskCard
      key={task.id}
      actionLabel={t('tasks.accept')}
      badge={index === 0 ? t('tasks.reward.firstOrder') : undefined}
      fee={formatFee(task.fee, currency)}
      feeNote={index === 0 ? t('tasks.feeNote') : undefined}
      items={task.items.length ? formatItems(task.items, t) : undefined}
      note={task.note}
      points={[
        { label: 'P', title: task.pickup.title, subtitle: task.pickup.address, distance: formatDistance(Math.max(task.distanceKm - 1.3, 0.5)) },
        { label: 'D', title: task.dropoff.title, distance: formatDistance(task.distanceKm) },
      ]}
      tags={index === 0 ? [t('tasks.tag.express')] : []}
      timeLabel={t('common.deliverWithin', { minutes: String(task.estimatedMinutes) })}
      onAction={() => router.push(`/task/${task.id}`)}
    />
  );

  const renderPickupTask = (task: DeliveryTask) => (
    <TaskCard
      key={task.id}
      actionLabel={t('tasks.arrivedPickup')}
      chatLabel={t('tasks.chat')}
      contactLabel={t('tasks.contact')}
      items={task.items.length ? formatItems(task.items, t) : undefined}
      note={task.note}
      orderId={task.orderId}
      points={[
        { label: 'P', title: task.pickup.title, subtitle: task.pickup.address, distance: t('common.fromHere', { distance: formatDistance(Math.max(task.distanceKm - 1.3, 0.5)) }) },
        { label: 'D', title: task.dropoff.title, distance: t('common.fromPickup', { distance: formatDistance(task.distanceKm) }) },
      ]}
      timeLabel={t('common.remaining', { minutes: String(task.estimatedMinutes) })}
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
        { label: 'P', title: task.pickup.title, distance: t('common.fromHere', { distance: formatDistance(Math.max(task.distanceKm - 1.3, 0.5)) }) },
        { label: 'D', title: task.dropoff.title, distance: t('common.fromPickup', { distance: formatDistance(task.distanceKm) }) },
      ]}
      tags={[t('tasks.tag.callOnArrival'), t('tasks.tag.doNotLeave')]}
      timeLabel={t('common.remaining', { minutes: String(task.estimatedMinutes) })}
      variant="active"
      onAction={() => router.push(`/task/${task.id}/sign`)}
    />
  );

  const renderContent = () => {
    if (!online) {
      return <EmptyState title={t('common.offlineTitle')} description={t('common.offlineDesc')} />;
    }

    if (activeTab === 'new') {
      return taskLists.available.length ? taskLists.available.map(renderNewTask) : <EmptyState title={t('common.noNewTasks')} description={t('common.noNewTasksDesc')} />;
    }

    if (activeTab === 'pickups') {
      return taskLists.pickups.length ? taskLists.pickups.map(renderPickupTask) : <EmptyState title={t('common.noPickups')} description={t('common.noPickupsDesc')} />;
    }

    return taskLists.deliveries.length ? taskLists.deliveries.map(renderDeliveryTask) : <EmptyState title={t('common.noDeliveries')} description={t('common.noDeliveriesDesc')} />;
  };

  const bottomPadding = Math.max(insets.bottom, 12);

  return (
    <View className="flex-1 bg-white">
      <TaskDetailHeader
        activeTab={activeTab}
        deliveriesLabel={taskLists.deliveries.length ? t('tasks.tabs.deliveries1') : t('tasks.tabs.deliveries0')}
        dutyStatus={dutyStatus}
        dutyStatusLabel={t(dutyLabelKey[dutyStatus])}
        newTasksLabel={t('tasks.tabs.new')}
        pickupsLabel={taskLists.pickups.length ? t('tasks.tabs.pickups1') : t('tasks.tabs.pickups0')}
        onDutyPress={openMenu}
        onMenuPress={() => router.push('/(main)/profile')}
        onTabChange={setActiveTab}
      />
      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-3 py-6">
        {renderContent()}
      </ScrollView>
      {!bondPaid && (
        <View className="absolute inset-0 items-center justify-center bg-black/50 px-8">
          <View className="gap-4 rounded-2xl bg-white p-8 shadow-xl">
            <Text className="text-center text-xl font-bold text-[#261816]">{t('tasks.deposit.title')}</Text>
            <Text className="text-center text-sm text-[#59413d]">{t('tasks.deposit.message')}</Text>
            <Button className="bg-[#961813]" onPress={() => router.push('/settings')}>
              {t('tasks.deposit.action')}
            </Button>
          </View>
        </View>
      )}
      <View
        className="flex-row items-center gap-3 border-t border-[#f7ddd9] bg-[#fff8f7] px-4 pt-3 shadow-sm"
        style={{ paddingBottom: bottomPadding }}
      >
        <Pressable className="items-center px-3 py-1" onPress={() => router.push('/settings')}>
          <AppIcon name="settings" className="text-2xl text-[#59413d]" />
          <Text className="mt-1 text-[11px] font-bold text-[#59413d]">{t('tasks.settings')}</Text>
        </Pressable>
        <Pressable className="flex-1 flex-row items-center justify-center gap-2 rounded-full border border-[#e1bfba] bg-white py-3 shadow-sm" onPress={() => void refetchTasks()}>
          <AppIcon name="refresh" className="text-xl text-[#961813]" />
          <Text className="text-base font-bold text-[#961813]">{t('tasks.refresh')}</Text>
        </Pressable>
      </View>
      <DutyStatusMenu
        cancelLabel={t('duty.menu.cancel')}
        current={dutyStatus}
        options={menuOptions}
        title={t('duty.menu.title')}
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onPick={(next) => void handlePick(next)}
      />
      <ConfirmDialog
        cancelLabel={t('duty.confirm.cancel')}
        message={pending ? t('duty.confirm.message', { from: t(dutyLabelKey[dutyStatus]), to: t(dutyLabelKey[pending]) }) : ''}
        okLabel={t('duty.confirm.ok')}
        title={t('duty.confirm.title')}
        visible={pending !== null}
        onCancel={() => setPending(null)}
        onOk={() => void confirmPending()}
      />
      <ConfirmDialog
        message={t('duty.block.activeTasks')}
        okLabel={t('duty.block.ok')}
        title={t('duty.block.title')}
        visible={blockVisible}
        onCancel={() => setBlockVisible(false)}
        onOk={() => setBlockVisible(false)}
      />
    </View>
  );
}
