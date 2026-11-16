/**
 * 送达 deadline 展示标签（20261115 批3：从 tasks.tsx 抽取共享——大厅卡/待取货 tab/
 * 配送中 tab/详情页四处同源，避免复制漂移）。
 *
 * 三档降级链（⑤B 锚点批 HTML 方案拍板）：
 * - 有锚点（estimatedArrival 有效）：主行「需在 HH:mm 前送达」，副行「剩 n 分钟 · 约 x km」；
 *   临期（<10min）timeTone error 红；超时「已超时（HH:mm）」红。
 * - 无锚点（历史单/解析失败）：主行「约 n 分钟」（诚实化——去掉「内送达」承诺语气），
 *   副行仅距离。
 * - 连距离也无：副行不渲染。绝不出「undefined 分钟」。
 */
import type { AppLanguage } from '../services/settings';
import { localeTagFor } from '../services/settings';
import { computeDeadline, DEADLINE_URGENT_MINUTES } from './deadline';
import { formatDistance } from './format';
import type { DeliveryTask } from '../types/task';
import type { TranslationKey, TranslationVars } from '../i18n/useTranslation';

type TranslateFn = (key: TranslationKey, vars?: TranslationVars) => string;

/**
 * 距离计费批次1 #5 收尾（2026-08-27）：formatDistance 返回 string|undefined，
 * t() 的 vars 不接受 undefined。先格式化，非空才套 i18n 模板。
 */
export const withDistance = (
  templateKey: 'common.totalDistance' | 'common.fromPickup' | 'tasks.billingDistance',
  km: number | undefined,
  t: TranslateFn,
): string | undefined => {
  const dist = formatDistance(km);
  return dist != null ? t(templateKey, { distance: dist }) : undefined;
};

/**
 * B+D 方案（20261116 拍板）：承诺死线 + 作业计时分离。
 *
 * 主行语义恒为「系统对客户的送达死线」（estimated_arrival，建单+45min，接单不漂移——
 * 方案 A 会漂移客户承诺已否决）。副行按任务阶段叠加作业计时：
 *   - ASSIGNED（已接单待取货）：副行加「取货剩 n 分钟」（SLA = SLA_PICKUP_MINUTES，
 *     acceptedAt 起算；与送达死线剩余取小者——死线更紧时以死线为准提示骑手）。
 *   - PICKED_UP/DELIVERING：副行加「已取货 · 剩 n 分钟」（送达死线剩余，同现有 urgent 红线）。
 *   - 终态/大厅（PENDING_ASSIGN）：无作业计时，保持原三档链。
 * now 参数注入（测试可控），默认 Date.now()。
 */
/** 接单→取货作业 SLA（分钟）：与送达 45min 同为 MVP 简单规则，立项 C 时一并动态化 */
export const SLA_PICKUP_MINUTES = 15;

export function buildDeadlineLabels(
  task: DeliveryTask,
  t: TranslateFn,
  language: AppLanguage,
  now: number = Date.now(),
): { timeLabel: string; timeSub?: string; timeTone?: 'default' | 'error' } {
  const dl = computeDeadline(task.estimatedArrival, now);
  const distancePart = withDistance('common.totalDistance', task.distanceKm, t);
  // 作业计时副行（B 方案）：ASSIGNED 阶段算取货剩余，取货后算送达剩余——
  // 时间源 assignedAt（接单时刻，DB 无独立 acceptedAt 列，acceptTask 写 assigned_at）
  const workPart = buildWorkPart(task, dl?.minutesLeft, t, now);
  if (dl) {
    const hhmm = dl.date.toLocaleTimeString(localeTagFor(language), {
      hour: '2-digit',
      minute: '2-digit',
    });
    if (dl.overdue) {
      return {
        timeLabel: t('tasks.deliverByOverdue', { time: hhmm }),
        timeSub: workPart?.text ?? distancePart,
        timeTone: 'error',
      };
    }
    return {
      timeLabel: t('tasks.deliverBy', { time: hhmm }),
      // 无作业计时的阶段（PENDING_ASSIGN/assignedAt 缺失）回退原「剩 n 分钟」——
      // 死线链副行不能因 workPart 缺失而丢时间（测试「历史单降级不崩」实证）
      timeSub:
        [workPart?.text ?? t('tasks.timeLeft', { minutes: dl.minutesLeft }), distancePart]
          .filter(Boolean)
          .join(' · ') || undefined,
      // B 方案：作业计时临期/超时同样点亮红（workPart urgent 与死线 urgent 取或）
      timeTone: dl.urgent || workPart?.urgent ? 'error' : 'default',
    };
  }
  // 诚实化回退：无锚点「约 n 分钟」，不承诺「内送达」
  return {
    timeLabel: t('common.deliverApprox', { minutes: String(task.estimatedMinutes ?? 0) }),
    timeSub: distancePart,
  };
}

/**
 * 作业计时片段（B 方案副行）：
 *   - ASSIGNED 且有 assignedAt：取货剩余 = SLA_PICKUP_MINUTES - 已用时；
 *     与送达死线剩余取小者（死线更紧 → 提示送达剩余，以最紧约束为准）；
 *     负数 → 「取货已超时」红（timeTone 经返回 error 传导）。
 *   - PICKED_UP/DELIVERING：送达死线剩余（复用 tasks.timeLeft 文案）。
 *   - 其他阶段（PENDING_ASSIGN/终态）或 assignedAt 缺失 → undefined（保持原链）。
 */
function buildWorkPart(
  task: DeliveryTask,
  deadlineMinutesLeft: number | undefined,
  t: TranslateFn,
  now: number,
): { text: string; urgent: boolean } | undefined {
  const assignedAt = task.assignedAt ? new Date(task.assignedAt) : null;
  const assignedValid = assignedAt && !Number.isNaN(assignedAt.getTime());
  if (task.status === 'ASSIGNED' && assignedValid) {
    const elapsed = (now - assignedAt!.getTime()) / 60_000;
    const pickupLeft = Math.floor(SLA_PICKUP_MINUTES - elapsed);
    if (deadlineMinutesLeft != null && deadlineMinutesLeft < pickupLeft) {
      // 送达死线比取货 SLA 更紧：以死线为准（最紧约束原则）
      return {
        text: t('tasks.timeLeft', { minutes: deadlineMinutesLeft }),
        urgent: deadlineMinutesLeft <= 0 || deadlineMinutesLeft < DEADLINE_URGENT_MINUTES,
      };
    }
    if (pickupLeft <= 0) return { text: t('tasks.pickupOverdue'), urgent: true };
    return {
      text: t('tasks.pickupTimeLeft', { minutes: pickupLeft }),
      urgent: pickupLeft < DEADLINE_URGENT_MINUTES,
    };
  }
  if (
    (task.status === 'PICKED_UP' || task.status === 'DELIVERING') &&
    deadlineMinutesLeft != null
  ) {
    return {
      text: t('tasks.timeLeft', { minutes: deadlineMinutesLeft }),
      urgent: deadlineMinutesLeft <= 0 || deadlineMinutesLeft < DEADLINE_URGENT_MINUTES,
    };
  }
  return undefined;
}
