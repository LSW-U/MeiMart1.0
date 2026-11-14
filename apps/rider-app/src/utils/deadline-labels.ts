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
import { computeDeadline } from './deadline';
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

export function buildDeadlineLabels(
  task: DeliveryTask,
  t: TranslateFn,
  language: AppLanguage,
): { timeLabel: string; timeSub?: string; timeTone?: 'default' | 'error' } {
  const dl = computeDeadline(task.estimatedArrival);
  const distancePart = withDistance('common.totalDistance', task.distanceKm, t);
  if (dl) {
    const hhmm = dl.date.toLocaleTimeString(localeTagFor(language), {
      hour: '2-digit',
      minute: '2-digit',
    });
    if (dl.overdue) {
      return {
        timeLabel: t('tasks.deliverByOverdue', { time: hhmm }),
        timeSub: distancePart,
        timeTone: 'error',
      };
    }
    return {
      timeLabel: t('tasks.deliverBy', { time: hhmm }),
      timeSub: `${t('tasks.timeLeft', { minutes: dl.minutesLeft })}${distancePart ? ` · ${distancePart}` : ''}`,
      timeTone: dl.urgent ? 'error' : 'default',
    };
  }
  // 诚实化回退：无锚点「约 n 分钟」，不承诺「内送达」
  return {
    timeLabel: t('common.deliverApprox', { minutes: String(task.estimatedMinutes ?? 0) }),
    timeSub: distancePart,
  };
}
