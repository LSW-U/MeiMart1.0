import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, RefreshControl, ScrollView, Text, View } from 'react-native';

import { DutyStatusMenu } from '../../src/components/business/DutyStatusMenu';
import { TaskCard } from '../../src/components/business/TaskCard';
import { TaskDetailHeader } from '../../src/components/business/TaskDetailHeader';
import { BottomActionBar } from '../../src/components/layout/BottomActionBar';
import { ConfirmDialog } from '../../src/components/feedback/ConfirmDialog';
import { EmptyState } from '../../src/components/feedback/EmptyState';
import { QueryBoundary } from '../../src/components/feedback/QueryBoundary';
import { showToast } from '../../src/components/feedback/Toast';
import { Button } from '../../src/components/ui';
import { useTranslation, type TranslationKey } from '../../src/i18n/useTranslation';
import { useNetwork } from '../../src/hooks/useNetwork';
import { useTaskLists } from '../../src/services/queries/useTask';
import { getTaskAction } from '../../src/services/task-flow';
import { useRiderSettings, useUpdateRiderSettings } from '../../src/services/queries/useSettings';
import { dutyStatusOptions, type DutyStatus } from '../../src/services/settings';
import { useAuthStore } from '../../src/store/useAuthStore';
import { colors } from '../../src/theme/colors';
import type { DeliveryTask } from '../../src/types/task';
import { formatCurrency, formatDistance } from '../../src/utils/format';
import { pickupDistance } from '../../src/utils/distance';

type TaskTab = 'new' | 'pickups' | 'deliveries';

const dutyLabelKey: Record<DutyStatus, 'duty.onDuty' | 'duty.offDuty' | 'duty.busy'> = {
  onDuty: 'duty.onDuty',
  offDuty: 'duty.offDuty',
  busy: 'duty.busy',
};

const formatItems = (items: string[], t: (key: TranslationKey, vars?: Record<string, string | number>) => string) => t('common.items', { items: items.join(' · ') });

// T6 §3.1: 联系按钮拨号回调工厂（tasks.tsx 3 处 active 卡共用；Linking 在调用方，组件不感知 task）
const contactHandler = (task: DeliveryTask, t: (key: TranslationKey, vars?: Record<string, string | number>) => string) =>
  task.dropoff.contactPhone
    ? () => {
        void Linking.openURL(`tel:${task.dropoff.contactPhone}`).catch(() =>
          showToast(t('common.callFailed'), 'error'),
        );
      }
    : () => showToast(t('tasks.noPhone'), 'info');

export default function TasksPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<TaskTab>(tabParam === 'pickups' ? 'pickups' : tabParam === 'deliveries' ? 'deliveries' : 'new');
  const [menuVisible, setMenuVisible] = useState(false);
  const [pending, setPending] = useState<DutyStatus | null>(null);
  const [blockVisible, setBlockVisible] = useState(false);

  const { data: settings } = useRiderSettings();
  const updateSettings = useUpdateRiderSettings();
  const dutyStatus = settings?.dutyStatus ?? 'offDuty';
  // B3: 消费三态——loading 骨架替代闪空态，error 显式重试（不再误报"暂无任务"）
  // B5: isFetching 供底栏刷新 spinner 反馈
  const { data: taskListsData, isLoading: taskListsLoading, isError: taskListsError, isFetching: taskListsFetching, refetch: refetchTasks } = useTaskLists();
  const taskLists = taskListsData ?? { available: [] as DeliveryTask[], pickups: [] as DeliveryTask[], deliveries: [] as DeliveryTask[] };
  const rider = useAuthStore((s) => s.rider);
  // §7.2 拍板：下拉刷新离线守卫——onlineManager 未配置，Query 不会自动拦离线 refetch，
  // 不守卫会真发请求 reject 后 QueryBoundary 切 error 态覆盖已有缓存数据
  const { isOffline } = useNetwork();

  const online = dutyStatus !== 'offDuty';
  const bondPaid = rider?.bondPaid ?? true;
  const activeTasksExist = taskLists.pickups.length + taskLists.deliveries.length > 0;
  const currency = t('common.currency');

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
    // 清单 #5：无 catch 时 mutateAsync reject → setPending(null) 跳过 → ConfirmDialog 卡死。
    // useUpdateRiderSettings.onError 已回滚缓存（UI 恢复旧状态），这里补 toast + 关弹窗。
    try {
      await updateSettings.mutateAsync({ dutyStatus: pending });
      setPending(null);
    } catch {
      showToast(t('duty.updateFailed'), 'error');
      setPending(null);
    }
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

  // §7.3 拍板 A：删 index 第二参数——Q1 假数据清零后无下标依赖；后端有 reward 字段再恢复
  const renderNewTask = (task: DeliveryTask) => (
    <TaskCard
      key={task.id}
      actionLabel={t('tasks.accept')}
      fee={formatCurrency(task.fee, currency, { decimals: task.fee % 1 === 0 ? 0 : 1 })}
      items={task.items.length ? formatItems(task.items, t) : undefined}
      note={task.note ?? undefined}
      points={[
        { label: 'P', title: task.pickup.title, subtitle: task.pickup.address, distance: formatDistance(pickupDistance(task.distanceKm)) },
        { label: 'D', title: task.dropoff.title, distance: formatDistance(task.distanceKm) },
      ]}
      timeLabel={t('common.deliverWithin', { minutes: String(task.estimatedMinutes) })}
      onAction={() => router.push(`/task/${task.id}`)}
    />
  );

  const renderPickupTask = (task: DeliveryTask) => {
    // S4: 用共享 helper（与详情页 statusAction 同源），避免两处状态机分散维护
    const action = getTaskAction(task);
    return (
      <TaskCard
        key={task.id}
        actionLabel={action ? t(action.labelKey) : t('tasks.arrivedPickup')}
        chatLabel={t('tasks.chat')}
        contactLabel={t('tasks.contact')}
        contactSuffix={task.dropoff.contactPhone ? `${t('tasks.recipientSuffix')} ${task.dropoff.contactPhone.slice(-4)}` : undefined}
        items={task.items.length ? formatItems(task.items, t) : undefined}
        note={task.note ?? undefined}
        orderId={task.orderId}
        points={[
          { label: 'P', title: task.pickup.title, subtitle: task.pickup.address, distance: t('common.fromHere', { distance: formatDistance(pickupDistance(task.distanceKm)) }) },
          { label: 'D', title: task.dropoff.title, distance: t('common.fromPickup', { distance: formatDistance(task.distanceKm) }) },
        ]}
        timeLabel={t('common.remaining', { minutes: String(task.estimatedMinutes) })}
        variant="active"
        onContact={contactHandler(task, t)}
        onAction={() => action && router.push(`/task/${task.id}/${action.target}`)}
      />
    );
  };

  const renderDeliveryTask = (task: DeliveryTask) => (
    <TaskCard
      key={task.id}
      actionLabel={t('tasks.arrivedDelivery')}
      chatLabel={t('tasks.chat')}
      contactLabel={t('tasks.contact')}
      contactSuffix={task.dropoff.contactPhone ? `${t('tasks.recipientSuffix')} ${task.dropoff.contactPhone.slice(-4)}` : undefined}
      // T6 审查 P1-1：note 只放真实客户备注（尾号已在联系按钮 contactSuffix 展示，
      // 原「有电话时 note 被尾号覆盖」会吞掉配送环节最关键的留言信息）
      note={task.note ?? undefined}
      orderId={task.orderId}
      points={[
        { label: 'P', title: task.pickup.title, distance: t('common.fromHere', { distance: formatDistance(pickupDistance(task.distanceKm)) }) },
        { label: 'D', title: task.dropoff.title, distance: t('common.fromPickup', { distance: formatDistance(task.distanceKm) }) },
      ]}
      timeLabel={t('common.remaining', { minutes: String(task.estimatedMinutes) })}
      variant="active"
      onContact={contactHandler(task, t)}
      onAction={() => router.push(`/task/${task.id}/sign`)}
    />
  );

  const emptyMeta: Record<TaskTab, { title: TranslationKey; desc: TranslationKey }> = {
    new: { title: 'common.noNewTasks', desc: 'common.noNewTasksDesc' },
    pickups: { title: 'common.noPickups', desc: 'common.noPickupsDesc' },
    deliveries: { title: 'common.noDeliveries', desc: 'common.noDeliveriesDesc' },
  };

  const renderContent = () => {
    if (!online) {
      return <EmptyState title={t('common.offlineTitle')} description={t('common.offlineDesc')} />;
    }

    // B3: 三态边界——loading 骨架 / error 重试 / 空态基于真实 data / 数据渲染
    return (
      <QueryBoundary
        data={taskListsData}
        emptyDescription={t(emptyMeta[activeTab].desc)}
        emptyTitle={t(emptyMeta[activeTab].title)}
        errorMessage={t('common.loadError.desc')}
        errorTitle={t('common.loadError.title')}
        isEmpty={(lists) => lists[activeTab === 'new' ? 'available' : activeTab].length === 0}
        isLoading={taskListsLoading}
        isError={taskListsError}
        retryLabel={t('common.retry')}
        skeleton="list"
        onRetry={() => void refetchTasks()}
      >
        {(lists) =>
          activeTab === 'new'
            ? lists.available.map(renderNewTask)
            : activeTab === 'pickups'
              ? lists.pickups.map(renderPickupTask)
              : lists.deliveries.map(renderDeliveryTask)
        }
      </QueryBoundary>
    );
  };

  return (
    <View className="flex-1 bg-background">
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
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-3 py-6"
        refreshControl={
          // B5 同款 danger 刷新色；refreshing 与底栏 spinner 同源 isFetching（双向一致反馈）
          <RefreshControl
            refreshing={taskListsFetching}
            onRefresh={() => {
              if (isOffline) {
                showToast(t('common.networkError'), 'error');
                return;
              }
              void refetchTasks();
            }}
            colors={[colors.danger]}
            tintColor={colors.danger}
          />
        }
      >
        {renderContent()}
      </ScrollView>
      {!bondPaid && (
        <View className="absolute inset-0 items-center justify-center bg-black/50 px-8">
          <View className="gap-4 rounded-2xl bg-surface p-8 shadow-xl">
            <Text className="text-center text-xl font-bold text-on-surface">{t('tasks.deposit.title')}</Text>
            <Text className="text-center text-sm text-on-surface-variant">{t('tasks.deposit.message')}</Text>
            <Button className="bg-primary-container" onPress={() => router.push('/settings')}>
              {t('tasks.deposit.action')}
            </Button>
          </View>
        </View>
      )}
      <BottomActionBar
        isRefreshing={taskListsFetching}
        refreshLabel={t('tasks.refresh')}
        settingsLabel={t('tasks.settings')}
        onPressSettings={() => router.push('/settings')}
        onRefresh={() => void refetchTasks()}
      />
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
