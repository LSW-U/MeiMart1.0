/**
 * 订单 Timeline 步骤合成（P10 订单详情 + P11 物流追踪 共享）
 *
 * 纯函数（无 hooks），label/desc 由组件层 t() 翻译后传入（复用 order.timeline.*）。
 * 真实时间戳来自 transformOrder 透传的 OrderRaw 字段（P10 §8.1 P0）。
 */
import type { OrderStatus } from '@/types';

export type StepState = 'completed' | 'active' | 'pending';

export type TimelineStepData = {
  id: string;
  label: string;
  desc: string;
  // Why: 真实时间戳（按 locale 短格式），空串 = 订单尚未到达该状态（pending 态）
  time: string;
  state: StepState;
  // Why: active 节点用 bannerIconSymbol 渲染状态图标（done 节点用 check，pending 无 icon）
  icon?: string;
};

// Why: buildTimelineSteps 是纯函数（无 hooks），label/desc 由组件层 t() 翻译后传入（复用 order.timeline.*）
export type TimelineLabels = {
  confirmed: { label: string; desc: string };
  processing: { label: string; desc: string };
  shipped: { label: string; desc: string };
  delivered: { label: string; desc: string };
  cancelled: { label: string; desc: string };
};

// Why: P10 §8.1 P0 - 订单时间戳集合，null/undefined = 订单尚未到达该状态
export type TimelineTimestamps = {
  createdAt: string;
  paidAt?: string | null;
  confirmedAt?: string | null;
  pickedAt?: string | null;
  deliveringAt?: string | null;
  deliveredAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
};

// Why: 时间戳短格式显示（zh: 5月12日 · 10:30 / en·tet: May 12 · 10:30），null/非法返空串
export function formatTimelineTime(ts: string | null | undefined, locale: string): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (locale === 'zh') {
    return `${d.getMonth() + 1}月${d.getDate()}日 · ${hh}:${mm}`;
  }
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[d.getMonth()]} ${d.getDate()} · ${hh}:${mm}`;
}

export function buildTimelineSteps(
  status: OrderStatus,
  ts: TimelineTimestamps,
  locale: string,
  labels: TimelineLabels,
  activeIcon?: string,
): TimelineStepData[] {
  // 已取消：只显示「提交 + 终态」两步
  if (status === 'CANCELLED') {
    return [
      {
        id: 's1',
        label: labels.confirmed.label,
        desc: labels.confirmed.desc,
        time: formatTimelineTime(ts.createdAt, locale),
        state: 'completed',
      },
      {
        id: 's2',
        label: labels.cancelled.label,
        desc: labels.cancelled.desc,
        time: formatTimelineTime(ts.cancelledAt, locale),
        state: 'active',
        icon: activeIcon,
      },
    ];
  }

  // Why: 每个步骤对应一个时间戳字段，优先用专用字段，回退相邻字段（paidAt 回退 confirmedAt 等）
  const baseSteps: { id: string; key: keyof TimelineLabels; tsField: string | null | undefined }[] = [
    { id: 's1', key: 'confirmed', tsField: ts.createdAt },
    { id: 's2', key: 'processing', tsField: ts.paidAt ?? ts.confirmedAt },
    { id: 's3', key: 'shipped', tsField: ts.pickedAt ?? ts.deliveringAt },
    { id: 's4', key: 'delivered', tsField: ts.deliveredAt ?? ts.completedAt },
  ];

  // Why: 每个状态对应 timeline 高亮的步骤索引（0=Order Confirmed / 1=Processing / 2=Shipped / 3=Delivered）
  const activeIdx: Record<OrderStatus, number> = {
    PENDING_PAYMENT: 0,
    PENDING_CONFIRM: 1,
    CONFIRMED: 1,
    PICKED: 2,
    OUT_FOR_DELIVERY: 2,
    DELIVERED_PAID: 3,
    DELIVERED_UNPAID: 3,
    DELIVERED: 3,
    COMPLETED: 3,
    CANCELLED: 0,
  };
  const current = activeIdx[status];

  return baseSteps.map((s, idx) => {
    const state: StepState = idx < current ? 'completed' : idx === current ? 'active' : 'pending';
    const stepLabel = labels[s.key];
    return {
      id: s.id,
      label: stepLabel.label,
      desc: stepLabel.desc,
      time: formatTimelineTime(s.tsField, locale),
      state,
      icon: state === 'active' ? activeIcon : undefined,
    };
  });
}
