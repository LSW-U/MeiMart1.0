import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { DutyStatusMenu } from '../../src/components/business/DutyStatusMenu';
import { TaskCard } from '../../src/components/business/TaskCard';
import { TaskDetailHeader } from '../../src/components/business/TaskDetailHeader';
import { BottomActionBar } from '../../src/components/layout/BottomActionBar';
import { ConfirmDialog } from '../../src/components/feedback/ConfirmDialog';
import { QueryBoundary } from '../../src/components/feedback/QueryBoundary';
import { showToast } from '../../src/components/feedback/Toast';
import { useGoBack } from '../../src/hooks/useGoBack';
import { useNetwork } from '../../src/hooks/useNetwork';
import { useTranslation, type TranslationKey } from '../../src/i18n/useTranslation';
import { ApiError } from '../../src/services/api';
import { useAcceptTask, useTask, useTaskLists } from '../../src/services/queries/useTask';
import { useRiderSettings, useUpdateRiderSettings } from '../../src/services/queries/useSettings';
import { dutyStatusOptions, type DutyStatus } from '../../src/services/settings';
import { getTaskAction } from '../../src/services/task-flow';
import { colors } from '../../src/theme/colors';
import type { DeliveryTask } from '../../src/types/task';
import { formatDistance } from '../../src/utils/format';
import { pickupDistance } from '../../src/utils/distance';

// T2 §7.7 拍板 A：内联复制（与 tasks.tsx 同源，不抽共享避免碰列表页）
const dutyLabelKey: Record<DutyStatus, 'duty.onDuty' | 'duty.offDuty' | 'duty.busy'> = {
  onDuty: 'duty.onDuty',
  offDuty: 'duty.offDuty',
  busy: 'duty.busy',
};

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
  // B5: isFetching 供底栏刷新 spinner 反馈
  const { data: task, isLoading: taskLoading, isError: taskError, isFetching: taskFetching, refetch } = useTask(id);
  const acceptTask = useAcceptTask();
  const { isOffline } = useNetwork();
  const taskData: DeliveryTask | null = task ?? null;
  const action = taskData ? getTaskAction(taskData) : undefined;
  // T2 §3.4: getTaskAction 返回 undefined = 终态（DELIVERED/FAILED），显示 banner + 返回列表
  const isTerminal = taskData !== null && !action;

  // T2 §3.1: 真实班次（原硬编码 onDuty），与 tasks.tsx 同源范式
  const { data: settings } = useRiderSettings();
  const updateSettings = useUpdateRiderSettings();
  const dutyStatus = settings?.dutyStatus ?? 'offDuty';
  const { data: taskLists } = useTaskLists();
  const activeTasksExist = ((taskLists?.pickups.length ?? 0) + (taskLists?.deliveries.length ?? 0)) > 0;

  // T2 §3.3: 切班流程（复用 tasks.tsx 已验证范式，含 T1 catch+toast）
  const [menuVisible, setMenuVisible] = useState(false);
  const [pending, setPending] = useState<DutyStatus | null>(null);
  const [blockVisible, setBlockVisible] = useState(false);

  const handlePick = (next: DutyStatus) => {
    if (next === dutyStatus) {
      setMenuVisible(false);
      return;
    }
    if (next === 'offDuty' && (dutyStatus === 'onDuty' || dutyStatus === 'busy') && activeTasksExist) {
      // 用派生数据判断是否有进行中任务（useTaskLists 缓存已含最新状态，无需后端再确认）
      setMenuVisible(false);
      setBlockVisible(true);
      return;
    }
    setMenuVisible(false);
    setPending(next);
  };

  const confirmPending = async () => {
    if (!pending) return;
    // 无 catch 时 mutateAsync reject → setPending(null) 跳过 → ConfirmDialog 卡死（T1 修的 bug）
    // useUpdateRiderSettings.onError 已回滚缓存（UI 恢复旧状态），这里补 toast + 关弹窗。
    try {
      await updateSettings.mutateAsync({ dutyStatus: pending });
      setPending(null);
    } catch {
      showToast(t('duty.updateFailed'), 'error');
      setPending(null);
    }
  };

  const menuOptions = dutyStatusOptions.map((value) => ({
    value,
    label: t(dutyLabelKey[value]),
    disabled: value === 'offDuty' && dutyStatus !== 'offDuty' && activeTasksExist,
  }));

  // Why: PENDING_ASSIGN 先 accept（接单）再跳；其他状态直接跳对应步骤页
  // T2 §3.4: 终态无 action → 返回列表（原 fallback 刷新当主 CTA 语义错位）
  const handleAction = async () => {
    if (!taskData || !action) {
      if (isTerminal) {
        goBack();
        return;
      }
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

  // S5: accept in-flight 时按钮显示"处理中"；T2: 终态显示"返回列表"（刷新仍走底栏）
  const actionLabel = acceptTask.isPending
    ? t('flow.processing')
    : action
      ? t(action.labelKey)
      : isTerminal
        ? t('tasks.backToList')
        : t('tasks.refresh');

  // T2 §3.4 判错 1 修正版：终态色调走 colors.* inline style（tailwind 无 success/status-*-bg
  // token，幽灵 class 会渲染为空；沿用 order/[id].tsx:58 先例）
  const terminalTone =
    taskData?.status === 'DELIVERED'
      ? { bg: colors.statusSuccessBg, border: colors.success, text: colors.statusSuccessText }
      : { bg: colors.statusDangerBg, border: colors.error, text: colors.statusDangerText };

  return (
    <View className="flex-1 bg-background">
      {/* T2 §3.2: 不传 4 个 tab prop——详情页单任务视图，tab 是列表页分组语义（死 tab 移除） */}
      <TaskDetailHeader
        dutyStatus={dutyStatus}
        dutyStatusLabel={t(dutyLabelKey[dutyStatus])}
        onDutyPress={() => setMenuVisible(true)}
        onMenuPress={() => router.push('/(main)/profile')}
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
            <>
              {detail.status === 'DELIVERED' || detail.status === 'FAILED' ? (
                <View
                  className="mb-3 rounded-xl border p-3"
                  style={{ backgroundColor: terminalTone.bg, borderColor: terminalTone.border }}
                >
                  <Text accessibilityRole="header" className="text-sm font-bold" style={{ color: terminalTone.text }}>
                    {detail.status === 'DELIVERED' ? t('tasks.terminalDelivered') : t('tasks.terminalFailed')}
                  </Text>
                  <Text className="mt-1 text-xs" style={{ color: terminalTone.text }}>
                    {detail.status === 'DELIVERED' ? t('tasks.terminalDeliveredSub') : t('tasks.terminalFailedSub')}
                  </Text>
                </View>
              ) : null}
              <TaskCard
                actionLabel={actionLabel}
                actionPending={acceptTask.isPending}
                chatLabel={t('tasks.chat')}
                contactLabel={t('tasks.contact')}
                items={detail.items.length ? formatItems(detail.items, t) : undefined}
                note={detail.note ?? undefined}
                orderId={detail.orderId}
                points={[
                  { label: 'P', title: detail.pickup.title, subtitle: detail.pickup.address, distance: t('common.fromHere', { distance: formatDistance(pickupDistance(detail.distanceKm)) }) },
                  { label: 'D', title: detail.dropoff.title, distance: t('common.fromPickup', { distance: formatDistance(detail.distanceKm) }) },
                ]}
                // T2 审查 P3-1：终态 time 显示状态文本 + 中性/错误色（原型 372/431 行），
                // 非终态保持「剩余 N 分钟」+ clock 图标
                timeLabel={
                  detail.status === 'DELIVERED' || detail.status === 'FAILED'
                    ? detail.status === 'DELIVERED'
                      ? t('tasks.terminalDelivered')
                      : t('tasks.terminalFailed')
                    : t('common.remaining', { minutes: String(detail.estimatedMinutes) })
                }
                timeTone={detail.status === 'DELIVERED' ? 'neutral' : detail.status === 'FAILED' ? 'error' : 'default'}
                variant="active"
                onAction={() => void handleAction()}
              />
            </>
          )}
        </QueryBoundary>
      </ScrollView>
      <BottomActionBar
        absolute
        isRefreshing={taskFetching}
        refreshLabel={t('tasks.refresh')}
        settingsLabel={t('tasks.settings')}
        onPressSettings={() => router.push('/settings')}
        onRefresh={() => void refetch()}
      />
      <DutyStatusMenu
        cancelLabel={t('duty.menu.cancel')}
        current={dutyStatus}
        options={menuOptions}
        title={t('duty.menu.title')}
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onPick={(next) => handlePick(next)}
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
