import { buildDeadlineLabels, SLA_PICKUP_MINUTES } from '../deadline-labels';
import { makeTask } from '../../services/__fixtures__/makeTask';
import type { DeliveryTask } from '../../types/task';

/**
 * B+D 方案（20261116 拍板）单测：承诺死线 + 作业计时分离。
 *
 * 主行语义不变（estimated_arrival 死线，deliverBy/deliverByOverdue 文案）；
 * 副行按阶段叠加作业计时：
 *   - ASSIGNED：取货剩 n 分钟（SLA_PICKUP_MINUTES=15，assignedAt 起算；
 *     死线剩余更紧时以死线为准——最紧约束原则）
 *   - PICKED_UP/DELIVERING：送达剩余（tasks.timeLeft）
 *   - PENDING_ASSIGN/终态：无作业计时（原三档链）
 * now 注入（computeDeadline 同口径），测试零 fake-timer。
 *
 * 基准时刻 now=2026-11-16T10:00:00Z；死线锚点按需相对 now 偏移。
 */
const NOW = new Date('2026-11-16T10:00:00Z').getTime();
const t = (key: string, vars?: Record<string, unknown>) => {
  // 极简翻译桩：取关键模板断言拼接结果（与 useTranslation 行为同构）
  const table: Record<string, string> = {
    'tasks.deliverBy': '需在 {time} 前送达',
    'tasks.deliverByOverdue': '已超时（{time}）',
    'tasks.timeLeft': '剩 {minutes} 分钟',
    'tasks.pickupTimeLeft': '取货剩 {minutes} 分钟',
    'tasks.pickupOverdue': '取货已超时',
    'common.deliverApprox': '约 {minutes} 分钟',
    'common.totalDistance': '全程 {distance}',
  };
  let s = table[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
};

function makeStatusTask(
  status: DeliveryTask['status'],
  overrides: {
    assignedAt?: string | null;
    estimatedArrival?: string | null;
    liveEta?: string | null;
  } = {},
): DeliveryTask {
  const base = makeTask(status, { id: 'x1', distanceKm: 2.0 });
  return {
    ...base,
    assignedAt: overrides.assignedAt !== undefined ? overrides.assignedAt : base.assignedAt,
    estimatedArrival:
      overrides.estimatedArrival !== undefined
        ? overrides.estimatedArrival
        : new Date(NOW + 40 * 60_000).toISOString(),
    liveEta: overrides.liveEta,
  } as DeliveryTask;
}

describe('buildDeadlineLabels B 方案：作业计时副行', () => {
  it('ASSIGNED + assignedAt 10 分钟前：取货剩 5 分钟（SLA 15-已用时）', () => {
    const task = makeStatusTask('ASSIGNED', {
      assignedAt: new Date(NOW - 10 * 60_000).toISOString(),
    });
    const r = buildDeadlineLabels(task, t, 'zh', NOW);
    expect(r.timeSub).toContain('取货剩 5 分钟');
    // 取货剩 5 <10min → workPart urgent 红（临期警示与死线 urgent 同源）
    expect(r.timeTone).toBe('error');
  });

  it('ASSIGNED 死线剩余比取货 SLA 更紧：以死线为准（最紧约束）', () => {
    // 死线剩 8 分钟 < 取货剩 15 分钟（刚接单）
    const task = makeStatusTask('ASSIGNED', {
      assignedAt: new Date(NOW - 1 * 60_000).toISOString(),
      estimatedArrival: new Date(NOW + 8 * 60_000).toISOString(),
    });
    const r = buildDeadlineLabels(task, t, 'zh', NOW);
    expect(r.timeSub).toContain('剩 8 分钟');
    expect(r.timeTone).toBe('error'); // <10min 临期红
  });

  it('ASSIGNED 取货 SLA 耗尽：取货已超时 + 红', () => {
    const task = makeStatusTask('ASSIGNED', {
      assignedAt: new Date(NOW - 20 * 60_000).toISOString(), // 已用时 20 > SLA 15
    });
    const r = buildDeadlineLabels(task, t, 'zh', NOW);
    expect(r.timeSub).toContain('取货已超时');
    expect(r.timeTone).toBe('error');
  });

  it('PICKED_UP：副行为送达剩余（tasks.timeLeft）', () => {
    const task = makeStatusTask('PICKED_UP');
    const r = buildDeadlineLabels(task, t, 'zh', NOW);
    expect(r.timeSub).toContain('剩 40 分钟');
    expect(r.timeLabel).toContain('需在');
  });

  it('PENDING_ASSIGN（大厅卡）：无作业计时，副行为死线剩余 + 距离（原三档链）', () => {
    const task = makeStatusTask('PENDING_ASSIGN', { assignedAt: null });
    const r = buildDeadlineLabels(task, t, 'zh', NOW);
    expect(r.timeSub).toBe('剩 40 分钟 · 全程 2.0km');
    expect(r.timeSub).not.toContain('取货');
  });

  it('ASSIGNED 但 assignedAt 缺失（历史单）：降级原三档链不崩', () => {
    const task = makeStatusTask('ASSIGNED', { assignedAt: null });
    const r = buildDeadlineLabels(task, t, 'zh', NOW);
    expect(r.timeSub).toContain('剩 40 分钟'); // 死线链兜底
    expect(r.timeSub).not.toContain('取货');
  });

  it('无死线锚点（历史单）+ ASSIGNED：诚实化回退不受作业计时污染', () => {
    const task = makeStatusTask('ASSIGNED', {
      assignedAt: new Date(NOW - 5 * 60_000).toISOString(),
      estimatedArrival: null,
    });
    const r = buildDeadlineLabels(task, t, 'zh', NOW);
    expect(r.timeLabel).toContain('约');
    expect(r.timeSub).toBe('全程 2.0km');
  });

  it('SLA 常量为 15 分钟（语义登记，防止无意改动）', () => {
    expect(SLA_PICKUP_MINUTES).toBe(15);
  });
});

/**
 * 方案 C（20261117）：主行锚点优先动态 liveEta，null/undefined 回退静态死线。
 */
describe('buildDeadlineLabels 方案 C：动态 liveEta 主行锚点', () => {
  const staticDeadline = new Date(NOW + 40 * 60_000).toISOString();
  const liveEta = new Date(NOW + 12 * 60_000).toISOString();

  it('liveEta 存在：主行显示动态时刻（比静态死线早 → 剩余分钟取 liveEta）', () => {
    const task = makeStatusTask('PICKED_UP', {
      estimatedArrival: staticDeadline,
      liveEta,
    });
    const r = buildDeadlineLabels(task, t, 'zh', NOW);
    // 副行「剩 n 分钟」按主行锚点（liveEta=12min）计算——computeDeadline 同源
    expect(r.timeSub).toContain('剩 12 分钟');
    expect(r.timeSub).not.toContain('剩 40 分钟');
    expect(r.timeLabel).toContain('需在');
  });

  it('liveEta null：回退静态死线（剩 40 分钟），降级链原样', () => {
    const task = makeStatusTask('PICKED_UP', {
      estimatedArrival: staticDeadline,
      liveEta: null,
    });
    const r = buildDeadlineLabels(task, t, 'zh', NOW);
    expect(r.timeSub).toContain('剩 40 分钟');
  });

  it('liveEta undefined（历史单/契约滞后）：回退静态死线不崩', () => {
    const task = makeStatusTask('ASSIGNED', {
      assignedAt: new Date(NOW - 10 * 60_000).toISOString(),
      estimatedArrival: staticDeadline,
    });
    expect(task.liveEta).toBeUndefined();
    const r = buildDeadlineLabels(task, t, 'zh', NOW);
    expect(r.timeLabel).toContain('需在');
    expect(r.timeSub).toContain('取货剩 5 分钟');
  });
});
