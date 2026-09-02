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
import { AppIcon, Button } from '../../src/components/ui';
import { useDepositStatus } from '../../src/services/queries/useDeposit';
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

const formatItems = (
  items: string[],
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
) => t('common.items', { items: items.join(' · ') });

/**
 * 距离计费批次1（2026-08-27）：配送费明细格式化。
 * baseFee/distanceFee 单位分 → 转 $X.XX 字符串；缺失返回 undefined（卡片不显明细行）。
 * 与 fee 总额一起构成「$9.00 / Base $5.00 / Distance $4.00」对账视图。
 */
const formatFeeBreakdown = (
  task: DeliveryTask,
  currency: string,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
): { base?: string; distance?: string } => {
  const fmt = (cents: number) =>
    formatCurrency(cents / 100, currency, { decimals: cents % 100 === 0 ? 0 : 1 });
  return {
    base:
      task.baseFee != null ? t('tasks.feeBreakdown.base', { fee: fmt(task.baseFee) }) : undefined,
    distance:
      task.distanceFee != null
        ? t('tasks.feeBreakdown.distance', { fee: fmt(task.distanceFee) })
        : undefined,
  };
};

/**
 * 距离计费批次1 #5 收尾（2026-08-27）：formatDistance 返回 string|undefined，
 * t() 的 vars 不接受 undefined。本 helper 先格式化，仅在非空时套 i18n 模板，
 * 避免历史订单无坐标时把 undefined 塞进 t() 触发 TS 报错 + 渲染「undefinedkm」。
 */
const withDistance = (
  templateKey: 'common.fromHere' | 'common.fromPickup' | 'tasks.billingDistance',
  km: number | undefined,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
): string | undefined => {
  const dist = formatDistance(km);
  return dist != null ? t(templateKey, { distance: dist }) : undefined;
};

// T6 §3.1: 联系按钮拨号回调工厂（tasks.tsx 3 处 active 卡共用；Linking 在调用方，组件不感知 task）
const contactHandler = (
  task: DeliveryTask,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
) =>
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
  const [activeTab, setActiveTab] = useState<TaskTab>(
    tabParam === 'pickups' ? 'pickups' : tabParam === 'deliveries' ? 'deliveries' : 'new',
  );
  const [menuVisible, setMenuVisible] = useState(false);
  const [pending, setPending] = useState<DutyStatus | null>(null);
  const [blockVisible, setBlockVisible] = useState(false);

  const { data: settings, isError: settingsError } = useRiderSettings();
  const updateSettings = useUpdateRiderSettings();
  // P6-1：dutyStatus 改三态推导（与 _layout 同源）。
  //   - settings 加载失败 → dutyStatus=null（保守不判离线，renderContent 走任务三态而非 offline 空态）
  //   - settings 成功 → 真实 dutyStatus（offDuty/onDuty/busy）
  // 原 `settings?.dutyStatus ?? 'offDuty'` 在 settings=undefined 时回退 offDuty → online=false → 误显「你已离线」（同 _layout 静默掉线根因）。
  const dutyStatus: DutyStatus | null = settingsError
    ? null
    : settings
      ? settings.dutyStatus
      : null;
  // P6-1：UI 展示值——header/menu 的 prop 类型是 DutyStatus（非 null）。
  //   加载中/失败时用 offDuty 占位，但 dutyLoading=true 让 header 显「加载中」+ 中性灰点
  //   （而非 offDuty 灰点 +「已下班」文案——见 P6 §四.9，避免瞬时误导骑手）。
  //   online=null 仍走任务三态，不切 offline 空态（settings 失败 ≠ 真下班）。
  const dutyStatusForUi: DutyStatus = dutyStatus ?? 'offDuty';
  // P6 §四.9：settings 未就绪（加载中/失败）→ header duty 区显「加载中」而非「已下班」。
  //   dutyStatusForUi 仅作 TaskDetailHeader/DutyStatusMenu 类型占位，dutyLoading 时视觉走 loading 分支。
  const dutyLoading = dutyStatus === null;
  // B3: 消费三态——loading 骨架替代闪空态，error 显式重试（不再误报"暂无任务"）
  // B5: isFetching 供底栏刷新 spinner 反馈
  const {
    data: taskListsData,
    isLoading: taskListsLoading,
    isError: taskListsError,
    isFetching: taskListsFetching,
    refetch: refetchTasks,
  } = useTaskLists();
  const taskLists = taskListsData ?? {
    available: [] as DeliveryTask[],
    pickups: [] as DeliveryTask[],
    deliveries: [] as DeliveryTask[],
  };
  const rider = useAuthStore((s) => s.rider);
  // §7.2 拍板：下拉刷新离线守卫——onlineManager 未配置，Query 不会自动拦离线 refetch，
  // 不守卫会真发请求 reject 后 QueryBoundary 切 error 态覆盖已有缓存数据
  const { isOffline } = useNetwork();

  // P6-1：null（settings 加载中/失败）→ online=null，renderContent 不走 offline 空态（保守不停派单展示）。
  const online: boolean | null = dutyStatus === null ? null : dutyStatus !== 'offDuty';
  // 批 G（2026-09-03）：bondPaid 布尔遮罩 → deposit 三态（HTML 6.3：未缴/PENDING/已缴）
  //   未缴 = depositAmount 0 且无 PENDING；PENDING = 有待确认申请；已缴 = 其余
  const { data: depositStatus } = useDepositStatus();
  const pendingDeposit = depositStatus?.recentRequests.find((r) => r.status === 'PENDING') ?? null;
  const bondPaid = depositStatus ? depositStatus.depositAmount > 0 : (rider?.bondPaid ?? true);
  const depositBlockReason: 'none' | 'unpaid' | 'pending' =
    pendingDeposit !== null ? 'pending' : bondPaid ? 'none' : 'unpaid';
  void rider; // rider 仅剩兜底（depositStatus 未加载时不拦截，保守可用）
  const activeTasksExist = taskLists.pickups.length + taskLists.deliveries.length > 0;
  const currency = t('common.currency');

  // 批 G：拦截弹窗「稍后」置 true（本会话不再弹；切换 duty/重进页面重置）
  const [depositDismissed, setDepositDismissed] = useState(false);
  const depositBlocked = depositBlockReason !== 'none' && !depositDismissed;

  const openMenu = () => setMenuVisible(true);

  const handlePick = async (next: DutyStatus) => {
    if (next === dutyStatusForUi) {
      setMenuVisible(false);
      return;
    }
    if (next === 'offDuty' && (dutyStatusForUi === 'onDuty' || dutyStatusForUi === 'busy')) {
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
        disabled: value === 'offDuty' && dutyStatusForUi !== 'offDuty' && activeTasksExist,
      })),
    [activeTasksExist, dutyStatusForUi, t],
  );

  // §7.3 拍板 A：删 index 第二参数——Q1 假数据清零后无下标依赖；后端有 reward 字段再恢复
  const renderNewTask = (task: DeliveryTask) => (
    <TaskCard
      key={task.id}
      actionLabel={t('tasks.accept')}
      fee={formatCurrency((task.fee ?? 0) / 100, currency, {
        decimals: (task.fee ?? 0) % 100 === 0 ? 0 : 1,
      })}
      // 距离计费批次1（2026-08-27）：明细 + 计费距离（billingDistanceKm 与骑行 distanceKm 分开展示）
      feeBreakdown={formatFeeBreakdown(task, currency, t)}
      items={task.items.length ? formatItems(task.items, t) : undefined}
      note={task.note ?? undefined}
      points={[
        {
          label: 'P',
          title: task.pickup.title,
          subtitle: task.pickup.address,
          distance: withDistance('common.fromHere', pickupDistance(task.distanceKm), t),
        },
        {
          label: 'D',
          title: task.dropoff.title,
          distance: withDistance('common.fromPickup', task.distanceKm, t),
        },
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
        contactSuffix={
          task.dropoff.contactPhone
            ? `${t('tasks.recipientSuffix')} ${task.dropoff.contactPhone.slice(-4)}`
            : undefined
        }
        feeBreakdown={formatFeeBreakdown(task, currency, t)}
        items={task.items.length ? formatItems(task.items, t) : undefined}
        note={task.note ?? undefined}
        orderId={task.orderId}
        points={[
          {
            label: 'P',
            title: task.pickup.title,
            subtitle: task.pickup.address,
            distance: withDistance('common.fromHere', pickupDistance(task.distanceKm), t),
          },
          // 计费距离 billingDistanceKm 独立展示在 dropoff（距离费基准，区别于骑行 distanceKm）
          {
            label: 'D',
            title: task.dropoff.title,
            distance: withDistance('common.fromPickup', task.distanceKm, t),
            subtitle: withDistance('tasks.billingDistance', task.billingDistanceKm, t),
          },
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
      contactSuffix={
        task.dropoff.contactPhone
          ? `${t('tasks.recipientSuffix')} ${task.dropoff.contactPhone.slice(-4)}`
          : undefined
      }
      feeBreakdown={formatFeeBreakdown(task, currency, t)}
      // T6 审查 P1-1：note 只放真实客户备注（尾号已在联系按钮 contactSuffix 展示，
      // 原「有电话时 note 被尾号覆盖」会吞掉配送环节最关键的留言信息）
      note={task.note ?? undefined}
      orderId={task.orderId}
      points={[
        {
          label: 'P',
          title: task.pickup.title,
          distance: withDistance('common.fromHere', pickupDistance(task.distanceKm), t),
        },
        // 计费距离 billingDistanceKm 独立展示在 dropoff（距离费基准，区别于骑行 distanceKm）
        {
          label: 'D',
          title: task.dropoff.title,
          distance: withDistance('common.fromPickup', task.distanceKm, t),
          subtitle: withDistance('tasks.billingDistance', task.billingDistanceKm, t),
        },
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
    // P6-1：仅 online===false（settings 明确 dutyStatus=offDuty）才走 offline 空态。
    //   online=null（settings 加载中/失败）保守不停派单 → 落 QueryBoundary 三态，不误显「你已离线」。
    //   原 `if (!online)` 把 null 当 falsy → settings 失败时误显离线空态（静默掉线根因），已修。
    if (online === false) {
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
        deliveriesLabel={
          taskLists.deliveries.length ? t('tasks.tabs.deliveries1') : t('tasks.tabs.deliveries0')
        }
        dutyStatus={dutyStatusForUi}
        dutyLoading={dutyLoading}
        dutyStatusLabel={t(dutyLabelKey[dutyStatusForUi])}
        newTasksLabel={t('tasks.tabs.new')}
        pickupsLabel={
          taskLists.pickups.length ? t('tasks.tabs.pickups1') : t('tasks.tabs.pickups0')
        }
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
      {depositBlocked && (
        <View className="absolute inset-0 items-center justify-center bg-black/50 px-8">
          <View className="w-full max-w-[280px] gap-4 rounded-3xl bg-surface p-6 shadow-xl">
            {depositBlockReason === 'unpaid' ? (
              // 三态①未缴（HTML：直跳缴纳页，非 settings；明示 ≥$1 可接单）
              <>
                <View className="bg-status-danger-bg mx-auto h-14 w-14 items-center justify-center rounded-full">
                  <AppIcon
                    accessibilityLabel={t('tasks.deposit.title')}
                    color={colors.danger}
                    name="deposit"
                    size={28}
                  />
                </View>
                <Text className="text-center text-lg font-bold text-on-surface">
                  {t('tasks.deposit.title')}
                </Text>
                <Text className="text-center text-sm leading-6 text-on-surface-variant">
                  {t('tasks.deposit.messageV2')}
                </Text>
                <Button
                  className="bg-primary-container"
                  onPress={() => router.push('/settings/deposit')}
                >
                  {t('tasks.deposit.goDeposit')}
                </Button>
                <Button
                  className="border border-outline bg-transparent"
                  onPress={() => setDepositDismissed(true)}
                >
                  {t('tasks.deposit.later')}
                </Button>
              </>
            ) : (
              // 三态②PENDING（HTML：已提交 $X 等待 admin 确认）
              <>
                <View className="bg-status-warning-bg mx-auto h-14 w-14 items-center justify-center rounded-full">
                  <AppIcon
                    accessibilityLabel={t('tasks.deposit.pendingTitle')}
                    color={colors.warning}
                    name="clock"
                    size={28}
                  />
                </View>
                <Text className="text-center text-lg font-bold text-on-surface">
                  {t('tasks.deposit.pendingTitle')}
                </Text>
                <Text className="text-center text-sm leading-6 text-on-surface-variant">
                  {t('tasks.deposit.pendingMessage', {
                    amount: formatCurrency((pendingDeposit?.requestedAmount ?? 0) / 100, currency),
                  })}
                </Text>
                <Button
                  className="border-warning border bg-transparent"
                  onPress={() => router.push('/settings/deposit/records')}
                >
                  {t('tasks.deposit.viewRequest')}
                </Button>
                <Button
                  className="border border-outline bg-transparent"
                  onPress={() => setDepositDismissed(true)}
                >
                  {t('tasks.deposit.gotIt')}
                </Button>
              </>
            )}
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
        current={dutyStatusForUi}
        options={menuOptions}
        title={t('duty.menu.title')}
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onPick={(next) => void handlePick(next)}
      />
      <ConfirmDialog
        cancelLabel={t('duty.confirm.cancel')}
        message={
          pending
            ? t('duty.confirm.message', {
                from: t(dutyLabelKey[dutyStatusForUi]),
                to: t(dutyLabelKey[pending]),
              })
            : ''
        }
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
