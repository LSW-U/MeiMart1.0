import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { TaskCard } from '../../src/components/business/TaskCard';
import { TaskDetailHeader } from '../../src/components/business/TaskDetailHeader';
import { QueryBoundary } from '../../src/components/feedback/QueryBoundary';
import { showToast } from '../../src/components/feedback/Toast';
import { AppIcon } from '../../src/components/ui';
import { useGoBack } from '../../src/hooks/useGoBack';
import { useNetwork } from '../../src/hooks/useNetwork';
import { useTranslation, type TranslationKey } from '../../src/i18n/useTranslation';
import { ApiError } from '../../src/services/api';
import { useAcceptTask, useTask } from '../../src/services/queries/useTask';
import { getTaskAction } from '../../src/services/task-flow';
import type { DeliveryTask } from '../../src/types/task';

const formatDistance = (distanceKm: number) => `${distanceKm.toFixed(1)}km`;
const formatItems = (items: string[], t: (key: TranslationKey, vars?: Record<string, string | number>) => string) => t('common.items', { items: items.join(' · ') });

// S6: accept 失败按 ApiError.code 差异化提示
// - E-DISPATCH-xxx（被抢/状态不对/类型错）/ 409 -> tasks.acceptFailed
// - 网络/超时/非 ApiError -> common.networkError
function resolveAcceptErrorMessage(e: unknown, t: (key: TranslationKey) => string): string {
  const isDispatchConflict = e instanceof ApiError && (e.code.startsWith('E-DISPATCH') || e.status === 409);
  return isDispatchConflict ? t('tasks.acceptFailed') : t('common.networkError');
}

export default function TaskDetailPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const goBack = useGoBack('/(main)/tasks');
  // B3: 三态——loading 骨架 / error 重试（弱网不再误报"任务不存在"）/ null 才是未找到
  const { data: task, isLoading: taskLoading, isError: taskError, refetch } = useTask(id);
  const acceptTask = useAcceptTask();
  const { isOffline } = useNetwork();
  const taskData: DeliveryTask | null = task ?? null;
  const action = taskData ? getTaskAction(taskData) : undefined;

  // Why: PENDING_ASSIGN 先 accept（接单）再跳；其他状态直接跳对应步骤页
  const handleAction = async () => {
    if (!taskData || !action) {
      void refetch();
      return;
    }
    // S5: 防重复点击（accept in-flight 期间禁用）
    if (acceptTask.isPending) return;
    if (taskData.status === 'PENDING_ASSIGN') {
      // CLAUDE.md 规则 14：抢单竞态敏感，离线直接阻止（不入队，避免恢复时任务已被抢）
      if (isOffline) {
        showToast(t('tasks.acceptBlockedOffline'), 'error');
        return;
      }
      try {
        await acceptTask.mutateAsync(id);
      } catch (e) {
        // S6: 按 ApiError.code 差异化提示（被抢/状态 vs 网络）
        showToast(resolveAcceptErrorMessage(e, t), 'error');
        void refetch();
        return;
      }
    }
    router.push(`/task/${id}/${action.target}`);
  };

  // S5: accept in-flight 时按钮显示"处理中"
  const actionLabel = acceptTask.isPending
    ? t('flow.processing')
    : action
      ? t(action.labelKey)
      : t('tasks.refresh');

  return (
    <View className="flex-1 bg-surface">
      <TaskDetailHeader
        activeTab="pickups"
        deliveriesLabel={t('tasks.tabs.deliveries0')}
        dutyStatus="onDuty"
        dutyStatusLabel={t('duty.onDuty')}
        newTasksLabel={t('tasks.tabs.new')}
        pickupsLabel={taskData ? t('tasks.tabs.pickups1') : t('tasks.tabs.pickups0')}
        onDutyPress={() => void goBack()}
        onMenuPress={() => void goBack()}
      />
      <ScrollView className="flex-1" contentContainerClassName="px-3 py-6 pb-28">
        <QueryBoundary<DeliveryTask | null>
          data={task}
          emptyDescription={t('common.taskNotFoundDesc')}
          emptyTitle={t('common.taskNotFound')}
          errorMessage={t('common.loadError.desc')}
          errorTitle={t('common.loadError.title')}
          isEmpty={(value) => value === null}
          isLoading={taskLoading}
          isError={taskError}
          retryLabel={t('common.retry')}
          skeleton="detail"
          onRetry={() => void refetch()}
        >
          {(detail) => (
            <TaskCard
              actionLabel={actionLabel}
              actionPending={acceptTask.isPending}
              chatLabel={t('tasks.chat')}
              contactLabel={t('tasks.contact')}
              items={detail.items.length ? formatItems(detail.items, t) : undefined}
              note={detail.note ?? undefined}
              orderId={detail.orderId}
              points={[
                { label: 'P', title: detail.pickup.title, subtitle: detail.pickup.address, distance: t('common.fromHere', { distance: formatDistance(Math.max(detail.distanceKm - 1.3, 0.5)) }) },
                { label: 'D', title: detail.dropoff.title, distance: t('common.fromPickup', { distance: formatDistance(detail.distanceKm) }) },
              ]}
              timeLabel={t('common.remaining', { minutes: String(detail.estimatedMinutes) })}
              variant="active"
              onAction={() => void handleAction()}
            />
          )}
        </QueryBoundary>
      </ScrollView>
      <View className="absolute bottom-0 left-0 right-0 flex-row items-center gap-4 border-t border-surface-variant bg-surface px-3 py-4">
        <Pressable accessibilityRole="button" accessibilityLabel={t('tasks.settings')} className="items-center px-2" onPress={() => router.push('/settings')}>
          <AppIcon name="settings" className="text-2xl text-on-surface-variant" />
          <Text className="mt-1 text-[10px] font-bold text-on-surface-variant">{t('tasks.settings')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('tasks.refresh')} className="flex-1 flex-row items-center justify-center gap-2 rounded-full border border-outline-variant bg-white py-4 shadow-sm" onPress={() => void refetch()}>
          <AppIcon name="refresh" className="text-xl text-primary-container" />
          <Text className="text-base font-bold text-primary-container">{t('tasks.refresh')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
