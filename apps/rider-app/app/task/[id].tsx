import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, ScrollView, Text, View } from 'react-native';

import { TaskCard } from '../../src/components/business/TaskCard';
import { TaskDetailHeader } from '../../src/components/business/TaskDetailHeader';
import { BottomActionBar } from '../../src/components/layout/BottomActionBar';
import { QueryBoundary } from '../../src/components/feedback/QueryBoundary';
import { showToast } from '../../src/components/feedback/Toast';
import { useGoBack } from '../../src/hooks/useGoBack';
import { useNetwork } from '../../src/hooks/useNetwork';
import { useTranslation, type TranslationKey } from '../../src/i18n/useTranslation';
import { ApiError } from '../../src/services/api';
import { useAcceptTask, useTask } from '../../src/services/queries/useTask';
import { useRiderSettings } from '../../src/services/queries/useSettings';
import type { DutyStatus } from '../../src/services/settings';
import { getTaskAction } from '../../src/services/task-flow';
import { colors } from '../../src/theme/colors';
import type { DeliveryTask } from '../../src/types/task';
import { formatDistance, formatCurrency } from '../../src/utils/format';
import { pickupDistance } from '../../src/utils/distance';

// T2 §7.7 拍板 A：内联复制（与 tasks.tsx 同源，不抽共享避免碰列表页）
const dutyLabelKey: Record<DutyStatus, 'duty.onDuty' | 'duty.offDuty' | 'duty.busy'> = {
  onDuty: 'duty.onDuty',
  offDuty: 'duty.offDuty',
  busy: 'duty.busy',
};

const formatItems = (items: string[], t: (key: TranslationKey, vars?: Record<string, string | number>) => string) => t('common.items', { items: items.join(' · ') });

/**
 * 距离计费批次1 #5 收尾（2026-08-27）：formatDistance 返回 string|undefined，
 * t() 的 vars 不接受 undefined。先格式化，非空才套 i18n 模板（与 tasks.tsx 同源）。
 */
const withDistance = (
  templateKey: 'common.fromHere' | 'common.fromPickup' | 'tasks.billingDistance',
  km: number | undefined,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
): string | undefined => {
  const dist = formatDistance(km);
  return dist != null ? t(templateKey, { distance: dist }) : undefined;
};

/** 距离计费批次1（2026-08-27）：配送费明细「基础 $X + 距离 $Y」（与 tasks.tsx 同源） */
const formatFeeBreakdown = (
  task: DeliveryTask,
  currency: string,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
): { base?: string; distance?: string } => {
  const fmt = (cents: number) => formatCurrency(cents / 100, currency, { decimals: cents % 100 === 0 ? 0 : 1 });
  return {
    base: task.baseFee != null ? t('tasks.feeBreakdown.base', { fee: fmt(task.baseFee) }) : undefined,
    distance: task.distanceFee != null ? t('tasks.feeBreakdown.distance', { fee: fmt(task.distanceFee) }) : undefined,
  };
};

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
  const { data: settings, isError: settingsError } = useRiderSettings();
  // P6 §四.9：settings 加载中/失败时 duty 区显「加载中」而非「已下班」（与 tasks.tsx 同源）。
  //   dutyStatus 仅作 TaskDetailHeader 类型占位，dutyLoading 时视觉走 loading 分支。
  const dutyStatus: DutyStatus = settingsError ? 'offDuty' : settings ? settings.dutyStatus : 'offDuty';
  const dutyLoading = settingsError ? true : !settings;

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
      {/* T2 §3.2: 不传 4 个 tab prop——详情页单任务视图，tab 是列表页分组语义（死 tab 移除）
          T6 §7.4 A: 不传 onDutyPress——详情页专注单任务，切班在列表页做（duty 区降级纯展示） */}
      <TaskDetailHeader
        dutyStatus={dutyStatus}
        dutyLoading={dutyLoading}
        dutyStatusLabel={t(dutyLabelKey[dutyStatus])}
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
                contactSuffix={detail.dropoff.contactPhone ? `${t('tasks.recipientSuffix')} ${detail.dropoff.contactPhone.slice(-4)}` : undefined}
                items={detail.items.length ? formatItems(detail.items, t) : undefined}
                note={detail.note ?? undefined}
                orderId={detail.orderId}
                fee={formatCurrency((detail.fee ?? 0) / 100, t('common.currency'), { decimals: (detail.fee ?? 0) % 100 === 0 ? 0 : 1 })}
                feeBreakdown={formatFeeBreakdown(detail, t('common.currency'), t)}
                points={[
                  { label: 'P', title: detail.pickup.title, subtitle: detail.pickup.address, distance: withDistance('common.fromHere', pickupDistance(detail.distanceKm), t) },
                  { label: 'D', title: detail.dropoff.title, distance: withDistance('common.fromPickup', detail.distanceKm, t), subtitle: withDistance('tasks.billingDistance', detail.billingDistanceKm, t) },
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
                // T6 §3.1: 联系按钮接线拨号（有电话 tel: 直拨，失败/无电话 toast；Linking 在调用方，组件不感知 task）
                onContact={
                  detail.dropoff.contactPhone
                    ? () => {
                        void Linking.openURL(`tel:${detail.dropoff.contactPhone}`).catch(() =>
                          showToast(t('common.callFailed'), 'error'),
                        );
                      }
                    : () => showToast(t('tasks.noPhone'), 'info')
                }
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
    </View>
  );
}
