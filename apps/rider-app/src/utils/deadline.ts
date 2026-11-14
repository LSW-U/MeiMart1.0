/**
 * 送达 deadline 锚点工具（骑手大厅卡片-后端配合需求②/⑤B 20261115）。
 *
 * 数据源：delivery_tasks.estimated_arrival（后端 toView 透传 estimatedArrival，ISO 串）。
 * 已知瑕疵：该值为建单时刻 + 45min 的静态锚点，接单不刷新——实时 ETA（Redis 位置）
 * 方案 C 另立项。本模块只负责「有锚点→绝对时刻+倒计时，无锚点→降级」的展示逻辑。
 *
 * 降级链（绝不出「undefined 分钟」/「Invalid Date」）：
 *   - estimatedArrival 缺失或解析失败 → null（调用方回退分钟口径文案）
 *   - minutesLeft <= 0 → overdue（「已超时」）
 */

/** 锚点解析：有效 Date 或 null（无效串/缺失一律 null，不抛错） */
export function parseDeadline(estimatedArrival?: string | null): Date | null {
  if (!estimatedArrival) return null;
  const d = new Date(estimatedArrival);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type DeadlineInfo = {
  date: Date;
  /** 剩余整分钟（向下取整；超时为负数或 0） */
  minutesLeft: number;
  /** 已超时（<= 0 分钟） */
  overdue: boolean;
  /** 临期（<10 分钟未超时）→ timeTone 'error' 红色 */
  urgent: boolean;
};

/** 临期阈值（分钟）：剩 <10 分钟红色警示（HTML 方案拍板） */
export const DEADLINE_URGENT_MINUTES = 10;

export function computeDeadline(
  estimatedArrival: string | null | undefined,
  now: number = Date.now(),
): DeadlineInfo | null {
  const date = parseDeadline(estimatedArrival);
  if (!date) return null;
  // 向下取整：剩 8.9 分钟显示「剩 8 分钟」（对骑手宁可保守不虚报宽裕）
  const minutesLeft = Math.floor((date.getTime() - now) / 60_000);
  return {
    date,
    minutesLeft,
    overdue: minutesLeft <= 0,
    urgent: minutesLeft > 0 && minutesLeft < DEADLINE_URGENT_MINUTES,
  };
}
