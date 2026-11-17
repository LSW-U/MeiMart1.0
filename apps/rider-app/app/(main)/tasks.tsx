import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, RefreshControl, Text, View } from 'react-native';

import { DutyStatusMenu } from '../../src/components/business/DutyStatusMenu';
import { TaskCard } from '../../src/components/business/TaskCard';
import { TaskDetailHeader } from '../../src/components/business/TaskDetailHeader';
import { BottomActionBar } from '../../src/components/layout/BottomActionBar';
import { ConfirmDialog } from '../../src/components/feedback/ConfirmDialog';
// 批B B1：保证金拦截弹窗抽公共组件（task/[id].tsx B2 接单失败拦截复用同款）
import { DepositBlockDialog } from '../../src/components/feedback/DepositBlockDialog';
import { EmptyState } from '../../src/components/feedback/EmptyState';
// F3/§4（20261117 立项）：上报异常弹层（已取消单 + 超时返仓共用）
import { ReportIssueDialog } from '../../src/components/feedback/ReportIssueDialog';
import { showToast } from '../../src/components/feedback/Toast';
import { useMinuteTick } from '../../src/hooks/useMinuteTick';
import { useDepositStatus } from '../../src/services/queries/useDeposit';
import { useTranslation, type TranslationKey } from '../../src/i18n/useTranslation';
import { useNetwork } from '../../src/hooks/useNetwork';
// F3/§4：useReportIssue（report-issue mutation + 离线入队）
import { useReportIssue, useTaskLists } from '../../src/services/queries/useTask';
import { getTaskAction } from '../../src/services/task-flow';
import { useRiderSettings, useUpdateRiderSettings } from '../../src/services/queries/useSettings';
import { dutyStatusOptions, type DutyStatus } from '../../src/services/settings';
import { useAuthStore } from '../../src/store/useAuthStore';
import { colors } from '../../src/theme/colors';
import type { DeliveryTask, ReportIssueReason } from '../../src/types/task';
// 时间锚点统一（20261115 批3）：buildDeadlineLabels/withDistance 抽共享模块——
// 大厅卡/待取货 tab/配送中 tab/详情页四处同源，详情页也引用本模块（防复制漂移）
import { buildDeadlineLabels, withDistance } from '../../src/utils/deadline-labels';
import { computeDeadline } from '../../src/utils/deadline';
import { formatCurrency } from '../../src/utils/format';

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
 * 商品摘要文案（20261115）：优先 itemsSummary（后端派生件数），缺 kinds 时只显件数。
 * 对齐行业惯例：接单决策看件数不看明细——明细/图片无使用场景，不展示。
 */
const formatItemsSummary = (
  task: DeliveryTask,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
): string | undefined => {
  const s = task.itemsSummary;
  if (!s || s.totalQty <= 0) return undefined;
  return s.kinds > 0 && s.kinds !== s.totalQty
    ? t('common.itemsSummaryKinds', { totalQty: s.totalQty, kinds: s.kinds })
    : t('common.itemsCount', { count: s.totalQty });
};

// buildDeadlineLabels/withDistance 已抽至 src/utils/deadline-labels.ts（20261115 批3），
// 详情页 [id].tsx 也引用同模块——四处（大厅卡/两 tab/详情）同源防复制漂移。

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

// withDistance 已抽至 src/utils/deadline-labels.ts（20261115 批3，同 buildDeadlineLabels）。

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
  const { t, language } = useTranslation();
  // B+D 方案（20261116）：每 60s tick 强制重渲——倒计时分钟数在页面停留时也会跳，
  // 不再依赖 refetch/切 tab 才刷新。tick 值进 useMemo deps → 三处 props map 重建
  // → 仅时间文案变的卡片重渲（TaskCard memo 下其余 bail out）。
  const minuteTick = useMinuteTick();
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
  // F3/§4（20261117 立项）：上报异常弹层状态 + mutation
  const reportIssue = useReportIssue();
  // 弹层当前针对的任务 + 原因子集（F3 传 ['ORDER_CANCELLED']；§4 超时返仓传 ['DEADLINE_OVERDUE_RETURN'] 且 note 必填）
  const [issueTarget, setIssueTarget] = useState<{
    taskId: string;
    reasons: readonly ReportIssueReason[];
    noteRequired: boolean;
  } | null>(null);
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

  // 方案 C（20261117 拍板③）：liveEta 变化要重新 getLists 才可见（useMinuteTick 只是
  // 重渲染 tick 不拉数据）。有活跃任务（pickups/deliveries 非空）时，60s tick 顺带
  // refetch 一次——等单空档（都空）不轮询；离线守卫（同 §7.2 下拉刷新，不守卫会
  // reject 后 QueryBoundary 切 error 态覆盖缓存）；活任务通常 1-3 条，负载可忽略。
  useEffect(() => {
    if (!activeTasksExist || isOffline) return;
    if (minuteTick > 0) void refetchTasks();
    // refetchTasks 引用稳定（react-query），不需要进 deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minuteTick, activeTasksExist, isOffline]);
  const currency = t('common.currency');
  // C-P2-5 依赖稳定性（审查 P1-1）：rider useTranslation 的 t 每渲染新建（useTranslation.ts:48），
  //   下述 useMemo deps 不能用 t——改依赖 language（语言不变则 t 行为等价，闭包捕获的
  //   language 与 t 一致）。t 仅在 memo 回调内消费，重算时取值仍正确。

  // 批 G：拦截弹窗「稍后」置 true（本会话不再弹；切换 duty/重进页面重置）
  const [depositDismissed, setDepositDismissed] = useState(false);
  const depositBlocked = depositBlockReason !== 'none' && !depositDismissed;

  const openMenu = () => setMenuVisible(true);

  // R-P1-4：FlatList 化——renderItem 改 useCallback 工厂（按 tab 一个稳定引用），
  // 原三处 .map renderXxx 每次渲染都是新函数，配合 memo(TaskCard) 会全部失效。
  const listData =
    activeTab === 'new'
      ? taskLists.available
      : activeTab === 'pickups'
        ? taskLists.pickups
        : taskLists.deliveries;

  // R-P1-4：keyExtractor 稳定引用（TaskCard id 稳定）
  const keyTaskId = useCallback((task: DeliveryTask) => task.id, []);

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
  // C-P2-5（审查 P1-1 修正后）：TaskCard 为 memo（TaskCard.tsx:66），points/feeBreakdown/
  //   onAction/onContact 须稳定引用——三处 renderXxx 的 props 组装走 useMemo 缓存，deps 用
  //   language（t 每渲染新建不能进 deps），语言/task 列表不变则 props 引用稳定 → 父级
  //   state 变化（弹窗/toast）时列表不整列重渲，points/feeBreakdown 每 task/语言变化才重建。
  const newTaskProps = useMemo(
    () =>
      new Map(
        taskLists.available.map((task) => [
          task.id,
          {
            // 大厅卡补订单号（20261114）：取货/配送卡均有 orderId，大厅漏传——
            // 骑手到店报单号取货用。⚠️ 用 orderNo（业务单号 MMxxx），不能用
            // orderId——那是 delivery_tasks.order_id 内部 UUID 外键（实测 7c47aacc-…
            // 显示到卡上，用户人工验收发现）；orderNo 缺失（历史单）降级回退。
            orderId: task.orderNo ?? task.orderId,
            actionLabel: t('tasks.accept'),
            fee: formatCurrency((task.fee ?? 0) / 100, currency, {
              decimals: (task.fee ?? 0) % 100 === 0 ? 0 : 1,
            }),
            // 大厅 COD 标记（20261114）：paymentMethod='COD' 时金额下黄 tag 提示代收——
            // 骑手抢单前知道送达要收现金；paymentMethod 缺失（历史单）不渲染
            codNote: task.paymentMethod === 'COD' ? t('tasks.codTag') : undefined,
            // 距离计费批次1（2026-08-27）：明细 + 计费距离（billingDistanceKm 与骑行 distanceKm 分开展示）
            feeBreakdown: formatFeeBreakdown(task, currency, t),
            items:
              formatItemsSummary(task, t) ??
              (task.items.length ? formatItems(task.items, t) : undefined),
            note: task.note ?? undefined,
            points: [
              {
                label: 'P' as const,
                title: task.pickup.title,
                subtitle: task.pickup.address,
                // 3A 距离去重（20261114）：全程距离只显在 P 行——原 P/D 两行显示同一
                // distanceKm 值（D 行「距取货点」标签名不副实），D 行不再重复
                distance: withDistance('common.totalDistance', task.distanceKm, t),
              },
              {
                label: 'D' as const,
                title: task.dropoff.title,
              },
            ],
            // ⑤B 锚点批（20261115）：三档降级链（绝对时刻+倒计时 / 约 n 分钟 / 距离也无则副行隐藏）
            ...buildDeadlineLabels(task, t, language),
            // 批B B3：预约单防御标注（scheduledFor 恒 undefined 时零渲染；后端未来透传即生效）
            scheduledFor: task.scheduledFor,
          },
        ]),
      ),
    // 原因：t 每渲染新建（useTranslation.ts:48），deps 用 language 替代（语言不变 t 行为等价，t 仅在回调内消费）——审查 P1-1 拍板
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [taskLists.available, language, currency, minuteTick],
  );

  const pickupTaskProps = useMemo(
    () =>
      new Map(
        taskLists.pickups.map((task) => {
          // S4: 用共享 helper（与详情页 statusAction 同源），避免两处状态机分散维护
          const action = getTaskAction(task);
          // F2/§4（20261117 立项）：CANCELLED 单 / 超时普通单按钮改「上报异常」
          // （与 actionHandlers 同条件，两处判断必须同步——见 actionHandlers 注释）
          const issueMode =
            task.orderStatus === 'CANCELLED' ||
            (task.taskType === 'delivery' &&
              computeDeadline(task.estimatedArrival)?.overdue === true);
          return [
            task.id,
            {
              actionLabel: issueMode
                ? t('tasks.reportIssue')
                : action
                  ? t(action.labelKey)
                  : t('tasks.arrivedPickup'),
              // F3 红 badge「订单已取消」（danger 配色，TaskCard cancelledNote 槽位）
              cancelledNote:
                task.orderStatus === 'CANCELLED' ? t('tasks.orderCancelledBadge') : undefined,
              chatLabel: t('tasks.chat'),
              contactLabel: t('tasks.contact'),
              contactSuffix: task.dropoff.contactPhone
                ? `${t('tasks.recipientSuffix')} ${task.dropoff.contactPhone.slice(-4)}`
                : undefined,
              feeBreakdown: formatFeeBreakdown(task, currency, t),
              items:
                formatItemsSummary(task, t) ??
                (task.items.length ? formatItems(task.items, t) : undefined),
              note: task.note ?? undefined,
              // 单号修复（20261115 批1）：orderId 是内部 UUID 外键，展示业务单号 orderNo（历史单缺失降级回退）
              orderId: task.orderNo ?? task.orderId,
              points: [
                {
                  label: 'P' as const,
                  title: task.pickup.title,
                  subtitle: task.pickup.address,
                  distance: withDistance('common.totalDistance', task.distanceKm, t),
                },
                // 计费距离 billingDistanceKm 独立展示在 dropoff（距离费基准，区别于骑行 distanceKm）
                {
                  label: 'D' as const,
                  title: task.dropoff.title,
                  distance: withDistance('common.fromPickup', task.distanceKm, t),
                  subtitle: withDistance('tasks.billingDistance', task.billingDistanceKm, t),
                },
              ],
              // 时间锚点统一（20261115 批3）：与大厅卡同源 buildDeadlineLabels 降级链——
              // 有锚点→「需在 HH:mm 前送达 · 剩 n 分钟」（临期/超时红）；无锚点→「约 n 分钟」；
              // 修复旧逻辑两问题：estimatedArrival 已超时仍显示「剩 45 分钟」+ estimatedMinutes
              // undefined 时渲染「剩 undefined 分钟」。预约单标注 scheduledFor 一并透传（与大厅卡同源）。
              ...buildDeadlineLabels(task, t, language),
              scheduledFor: task.scheduledFor,
              actionTarget: action?.target,
            },
          ];
        }),
      ),
    // 原因：t 每渲染新建（useTranslation.ts:48），deps 用 language 替代（语言不变 t 行为等价，t 仅在回调内消费）——审查 P1-1 拍板
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [taskLists.pickups, language, currency, minuteTick],
  );

  const deliveryTaskProps = useMemo(
    () =>
      new Map(
        taskLists.deliveries.map((task) => {
          // 20261116 三步流统一：deliveries 现含 PICKED_UP（开始配送）+ DELIVERING（去签收），
          // 按钮文案/目标走 getTaskAction 同源（原硬编码 arrivedDelivery 对 PICKED_UP 语义错位）
          const action = getTaskAction(task);
          // F2/§4（20261117 立项）：同 pickupTaskProps——CANCELLED 单 / 超时普通单改「上报异常」
          const issueMode =
            task.orderStatus === 'CANCELLED' ||
            (task.taskType === 'delivery' &&
              computeDeadline(task.estimatedArrival)?.overdue === true);
          return [
            task.id,
            {
              actionLabel: issueMode
                ? t('tasks.reportIssue')
                : action
                  ? t(action.labelKey)
                  : t('tasks.arrivedDelivery'),
              cancelledNote:
                task.orderStatus === 'CANCELLED' ? t('tasks.orderCancelledBadge') : undefined,
              chatLabel: t('tasks.chat'),
              contactLabel: t('tasks.contact'),
              contactSuffix: task.dropoff.contactPhone
                ? `${t('tasks.recipientSuffix')} ${task.dropoff.contactPhone.slice(-4)}`
                : undefined,
              feeBreakdown: formatFeeBreakdown(task, currency, t),
              // T6 审查 P1-1：note 只放真实客户备注（尾号已在联系按钮 contactSuffix 展示，
              // 原「有电话时 note 被尾号覆盖」会吞掉配送环节最关键的留言信息）
              note: task.note ?? undefined,
              // 单号修复（20261115 批1）：orderId 是内部 UUID 外键，展示业务单号 orderNo（历史单缺失降级回退）
              orderId: task.orderNo ?? task.orderId,
              points: [
                {
                  label: 'P' as const,
                  title: task.pickup.title,
                  distance: withDistance('common.totalDistance', task.distanceKm, t),
                },
                // 计费距离 billingDistanceKm 独立展示在 dropoff（距离费基准，区别于骑行 distanceKm）
                {
                  label: 'D' as const,
                  title: task.dropoff.title,
                  distance: withDistance('common.fromPickup', task.distanceKm, t),
                  subtitle: withDistance('tasks.billingDistance', task.billingDistanceKm, t),
                },
              ],
              // 时间锚点统一（20261115 批3）：同上 buildDeadlineLabels 降级链（配送中 tab 与大厅/取货同源）
              ...buildDeadlineLabels(task, t, language),
              actionTarget: action?.target,
            },
          ];
        }),
      ),
    // 原因：t 每渲染新建（useTranslation.ts:48），deps 用 language 替代（语言不变 t 行为等价，t 仅在回调内消费）——审查 P1-1 拍板
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [taskLists.deliveries, language, currency, minuteTick],
  );

  // C-P2-5：contactHandler 柯里化（TaskCard.tsx 原 :76）每渲染新函数也是不稳定引用——
  //   同样按 task.id 缓存（Linking 在调用方，组件不感知 task）
  const contactHandlers = useMemo(
    () =>
      new Map(
        [...taskLists.pickups, ...taskLists.deliveries].map((task) => [
          task.id,
          contactHandler(task, t),
        ]),
      ),
    // 原因：t 每渲染新建（useTranslation.ts:48），deps 用 language 替代（语言不变 t 行为等价，t 仅在回调内消费）——审查 P1-1 拍板
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [taskLists.pickups, taskLists.deliveries, language],
  );

  // C-P2-5：onAction 回调按 task.id 稳定缓存（避免 renderXxx 内联箭头使 memo 失效）
  // F2/§4（20261117 立项）：进行中任务若 orderStatus==='CANCELLED' → 按钮改「上报异常」，
  //   onAction 打开弹层（reason=ORDER_CANCELLED）而非正常流转——订单没了继续配送必 409。
  //   §4：普通单（taskType==='delivery'）送达死线已超时 → 按钮改「上报异常」，
  //   弹层 reason=DEADLINE_OVERDUE_RETURN 且 note 必填（拍板）。与 return 任务
  //   PICKED_UP 的「开始返仓」（getTaskAction startReturn，正常流转）语义区分。
  const actionHandlers = useMemo(() => {
    const map = new Map<string, () => void>();
    for (const task of taskLists.available) {
      map.set(task.id, () => router.push(`/task/${task.id}`));
    }
    for (const task of taskLists.pickups) {
      const cancelled = task.orderStatus === 'CANCELLED';
      // 与 props map 层 issueMode 同条件（那边管文案，这边管动作）；
      // buildDeadlineLabels 的 t/language 只影响文案，不影响 overdue 裁定——
      // 此处直接 computeDeadline 判静态死线超时（同挂账#6 裁定：liveEta 不掩盖超时）
      const overdue =
        !cancelled &&
        task.taskType === 'delivery' &&
        computeDeadline(task.estimatedArrival)?.overdue === true;
      if (cancelled || overdue) {
        map.set(task.id, () =>
          setIssueTarget({
            taskId: task.id,
            reasons: cancelled ? ['ORDER_CANCELLED'] : ['DEADLINE_OVERDUE_RETURN'],
            noteRequired: !cancelled, // §4 拍板：超时返仓备注必填
          }),
        );
        continue;
      }
      const action = getTaskAction(task);
      map.set(task.id, () => action && router.push(`/task/${task.id}/${action.target}`));
    }
    for (const task of taskLists.deliveries) {
      // 20261116 三步流统一修复：原硬编码跳 sign——PICKED_UP 落入 deliveries 后会
      // 绕过 startDelivering 静默跳步（sign 守卫允许 PICKED_UP 进入，状态不推进）。
      // 与 pickups 同款走 getTaskAction：PICKED_UP→navigate / DELIVERING→sign
      const cancelled = task.orderStatus === 'CANCELLED';
      const overdue =
        !cancelled &&
        task.taskType === 'delivery' &&
        computeDeadline(task.estimatedArrival)?.overdue === true;
      if (cancelled || overdue) {
        map.set(task.id, () =>
          setIssueTarget({
            taskId: task.id,
            reasons: cancelled ? ['ORDER_CANCELLED'] : ['DEADLINE_OVERDUE_RETURN'],
            noteRequired: !cancelled,
          }),
        );
        continue;
      }
      const action = getTaskAction(task);
      map.set(task.id, () => action && router.push(`/task/${task.id}/${action.target}`));
    }
    return map;
  }, [router, taskLists.available, taskLists.pickups, taskLists.deliveries]);
  // ⚠️ deps 不含 t/language：issueMode 判定只用 computeDeadline（纯函数），文案在
  //   props map 层（deps 已含 language）取——保持 onAction 引用稳定（C-P2-5 memo 契约）。

  const renderNewTask = useCallback(
    (task: DeliveryTask) => {
      const props = newTaskProps.get(task.id);
      if (!props) return null;
      return <TaskCard key={task.id} {...props} onAction={actionHandlers.get(task.id)} />;
    },
    [newTaskProps, actionHandlers],
  );

  const renderPickupTask = useCallback(
    (task: DeliveryTask) => {
      const props = pickupTaskProps.get(task.id);
      if (!props) return null;
      const { actionTarget, ...cardProps } = props;
      return (
        <TaskCard
          key={task.id}
          {...cardProps}
          returnNote={task.taskType === 'return' ? t('tasks.returnTag') : undefined}
          variant="active"
          onContact={contactHandlers.get(task.id)}
          onAction={actionHandlers.get(task.id)}
        />
      );
    },
    // 原因：t 每渲染新建（useTranslation.ts:48），deps 用 language 替代（同 deliveryTaskProps 口径）——审查 P1-1 拍板
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pickupTaskProps, contactHandlers, actionHandlers, language],
  );

  const renderDeliveryTask = useCallback(
    (task: DeliveryTask) => {
      const props = deliveryTaskProps.get(task.id);
      if (!props) return null;
      // 20261116 方案 α：退货 tag（内部路由参数，不下传 TaskCard）
      const { actionTarget, ...cardProps } = props;
      return (
        <TaskCard
          key={task.id}
          {...cardProps}
          returnNote={task.taskType === 'return' ? t('tasks.returnTag') : undefined}
          variant="active"
          onContact={contactHandlers.get(task.id)}
          onAction={actionHandlers.get(task.id)}
        />
      );
    },
    // 原因：t 每渲染新建（useTranslation.ts:48），deps 用 language 替代（同 deliveryTaskProps 口径）——审查 P1-1 拍板
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deliveryTaskProps, contactHandlers, actionHandlers, language],
  );

  // R-P1-4 + C-P2-5：renderItem useCallback 工厂（按 tab 一个稳定引用）；
  //   renderXxx 本身已 useCallback 且内部 props 走 memo 缓存，依赖收敛为三函数引用
  const renderTaskItem = useCallback(
    ({ item }: { item: DeliveryTask }) =>
      activeTab === 'new'
        ? renderNewTask(item)
        : activeTab === 'pickups'
          ? renderPickupTask(item)
          : renderDeliveryTask(item),
    [activeTab, renderNewTask, renderPickupTask, renderDeliveryTask],
  );

  const emptyMeta: Record<TaskTab, { title: TranslationKey; desc: TranslationKey }> = {
    new: { title: 'common.noNewTasks', desc: 'common.noNewTasksDesc' },
    pickups: { title: 'common.noPickups', desc: 'common.noPickupsDesc' },
    deliveries: { title: 'common.noDeliveries', desc: 'common.noDeliveriesDesc' },
  };

  // R-P1-4：三态边界移入 FlatList props——loading 骨架 / error 重试 / 空态 / 数据渲染
  //   （原 ScrollView + QueryBoundary children .map 全量渲染；FlatList 回收屏外卡片）
  const listContent = () => {
    // P6-1：仅 online===false（settings 明确 dutyStatus=offDuty）才走 offline 空态。
    if (online === false) {
      return <EmptyState title={t('common.offlineTitle')} description={t('common.offlineDesc')} />;
    }
    if (taskListsLoading) {
      // 骨架直接渲染（对齐 QueryBoundary 内部 QuerySkeleton list 输出，testID 同款）
      // flex-1 包裹：无弹性占位时底栏会紧跟骨架上浮（同 offDuty 空态问题）
      return (
        <View className="flex-1" testID="query-skeleton">
          <View className="rounded-lg border border-surface-variant p-3.5">
            <View className="h-3.5 w-1/2 rounded bg-surface-variant" />
            <View className="mt-2.5 h-3.5 w-3/5 rounded bg-surface-variant" />
            <View className="mt-2.5 h-3.5 w-2/5 rounded bg-surface-variant" />
          </View>
          <View className="mt-2.5 rounded-lg border border-surface-variant p-3.5">
            <View className="h-3.5 w-1/2 rounded bg-surface-variant" />
            <View className="mt-2.5 h-3.5 w-3/5 rounded bg-surface-variant" />
          </View>
        </View>
      );
    }
    if (taskListsError) {
      return (
        <View className="flex-1 items-center rounded-3xl bg-surface p-6" testID="query-error">
          <Text className="text-lg font-bold text-on-surface">{t('common.loadError.title')}</Text>
          <Text className="mt-2 text-center text-sm text-on-surface-variant">
            {t('common.loadError.desc')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.retry')}
            className="mt-4 rounded-full bg-primary px-6 py-2"
            onPress={() => void refetchTasks()}
          >
            <Text className="text-sm font-semibold text-white">{t('common.retry')}</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <FlatList
        className="flex-1"
        contentContainerClassName="gap-6 px-3 py-6"
        data={listData}
        renderItem={renderTaskItem}
        keyExtractor={keyTaskId}
        ListEmptyComponent={
          // R-P2-21（走查 20261024）：任务空态接图标 +「切换状态」CTA——打开 DutyStatusMenu
          //（文案复用 duty.menu.title，零新增 i18n key）
          <EmptyState
            actionLabel={t('duty.menu.title')}
            description={t(emptyMeta[activeTab].desc)}
            iconName="orders"
            title={t(emptyMeta[activeTab].title)}
            onAction={() => setMenuVisible(true)}
          />
        }

        refreshControl={
          <RefreshControl
            refreshing={taskListsFetching}
            onRefresh={() => {
              if (isOffline) {
                showToast(t('common.networkError'), 'error');
                return;
              }
              void refetchTasks();
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    );
  };

  // F3/§4：上报异常提交（在线直调；离线由 useReportIssue 入队，成功 toast 由 mutationFn resolve 后区分）
  const handleReportIssueSubmit = async (body: {
    reason: ReportIssueReason;
    note?: string;
    evidenceUrls?: string[];
  }) => {
    if (!issueTarget) return;
    try {
      const res = await reportIssue.mutateAsync({ taskId: issueTarget.taskId, body });
      if (!res) {
        // 离线入队成功（mutationFn 返回 null）
        showToast(t('tasks.issue.offlineSaved'), 'info');
      } else {
        // 在线成功：ticketNo 回显（D20 响应增量字段）
        showToast(t('tasks.issue.success', { ticketNo: res.ticketNo ?? '' }), 'success');
      }
      setIssueTarget(null);
    } catch {
      showToast(t('tasks.issue.failed'), 'error');
    }
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
      {listContent()}
      {depositBlocked && (
        // 批B B1：抽公共 DepositBlockDialog——未缴态 CTA 改跳 /settings/deposit/pay 缴款页
        //（原 /settings/deposit 首页）；pending 态维持跳 records。视觉与原内联实现一致。
        <DepositBlockDialog
          pendingAmount={formatCurrency((pendingDeposit?.requestedAmount ?? 0) / 100, currency)}
          reason={depositBlockReason === 'pending' ? 'pending' : 'unpaid'}
          visible
          onDismiss={() => setDepositDismissed(true)}
          onGoDeposit={() => router.push('/settings/deposit/pay')}
          onViewRequest={() => router.push('/settings/deposit/records')}
        />
      )}
      {online !== false && (
        // 已下班（online===false）隐藏底栏：不派单无刷新意义，设置走左上角汉堡菜单
        // （header 无条件渲染）→ profile → settings；online=null（settings 加载失败）保守保留。
        // 同时消除 offDuty 空态下底栏失去 flex-1 撑开元素而上浮的问题。
        <BottomActionBar
          isRefreshing={taskListsFetching}
          refreshLabel={t('tasks.refresh')}
          settingsLabel={t('tasks.settings')}
          onPressSettings={() => router.push('/settings')}
          onRefresh={() => void refetchTasks()}
        />
      )}
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
        // P3-1：无 cancel 按钮，backdrop 读屏标签不能 fallback 到「确定」——传关闭语义
        backdropCloseLabel={t('common.close')}
        onCancel={() => setBlockVisible(false)}
        onOk={() => setBlockVisible(false)}
      />
      {/* F3/§4：上报异常弹层（reason 子集/note 必填由 issueTarget 圈定） */}
      <ReportIssueDialog
        noteRequired={issueTarget?.noteRequired ?? false}
        reasons={issueTarget?.reasons ?? ['ORDER_CANCELLED']}
        submitting={reportIssue.isPending}
        visible={issueTarget !== null}
        onDismiss={() => setIssueTarget(null)}
        onSubmit={(body) => void handleReportIssueSubmit(body)}
      />
    </View>
  );
}
