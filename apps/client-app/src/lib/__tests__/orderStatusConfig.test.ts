// P12 审查报告 Q5:补 ORDER_STATUS_GROUPS / tabStatuses / ORDER_TABS 配置断言
// Why: 防回归 —— GROUPS 是 Tab 过滤/角标/profile 4 宫格计数三处共用的单一来源，
//      若有人改漏状态（如 review 丢 DELIVERED_PAID/UNPAID，或 to-ship 丢 PENDING_CONFIRM），
//      会直接导致 B2 漏单 bug 复发。纯配置断言，零 hook 渲染，最快防漂移。
import {
  ORDER_STATUS_GROUPS,
  ORDER_TABS,
  tabStatuses,
} from '../orderStatusConfig';

describe('ORDER_STATUS_GROUPS（P12 单一来源）', () => {
  it('review 组含所有已送达状态（含 DELIVERED_PAID/UNPAID 货到付款送达）', () => {
    // Why: 原 ORDER_COUNT_MAP 只列 DELIVERED+COMPLETED，漏货到付款送达两态；
    //      P12 Commit 2 补全，本断言防再次漏掉
    expect(ORDER_STATUS_GROUPS.review).toEqual([
      'DELIVERED',
      'DELIVERED_PAID',
      'DELIVERED_UNPAID',
      'COMPLETED',
    ]);
  });

  it('to-ship 含 PENDING_CONFIRM + CONFIRMED（修复 B2 漏 PENDING_CONFIRM）', () => {
    expect(ORDER_STATUS_GROUPS['to-ship']).toEqual(['PENDING_CONFIRM', 'CONFIRMED']);
  });

  it('to-receive 含 PICKED + OUT_FOR_DELIVERY（修复 B2 漏 PICKED）', () => {
    expect(ORDER_STATUS_GROUPS['to-receive']).toEqual(['PICKED', 'OUT_FOR_DELIVERY']);
  });

  it('to-pay 仅 PENDING_PAYMENT', () => {
    expect(ORDER_STATUS_GROUPS['to-pay']).toEqual(['PENDING_PAYMENT']);
  });

  it('CANCELLED 不属任何业务组（用户决策：只在 all 可见）', () => {
    const allGrouped = Object.values(ORDER_STATUS_GROUPS).flat();
    expect(allGrouped).not.toContain('CANCELLED');
  });
});

describe('tabStatuses', () => {
  it("'all' 返回 'all'（不过滤）", () => {
    expect(tabStatuses('all')).toBe('all');
  });

  it('业务 tab 返回对应状态集（与 GROUPS 一致）', () => {
    expect(tabStatuses('to-pay')).toEqual(ORDER_STATUS_GROUPS['to-pay']);
    expect(tabStatuses('to-ship')).toEqual(ORDER_STATUS_GROUPS['to-ship']);
    expect(tabStatuses('to-receive')).toEqual(ORDER_STATUS_GROUPS['to-receive']);
    expect(tabStatuses('review')).toEqual(ORDER_STATUS_GROUPS.review);
  });
});

describe('ORDER_TABS（P12 重构）', () => {
  it('5 个 tab（all + 4 业务组）且 key 唯一', () => {
    expect(ORDER_TABS).toHaveLength(5);
    const keys = ORDER_TABS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual(['all', 'to-pay', 'to-ship', 'to-receive', 'review']);
  });

  it('all countable=false，4 业务 tab countable=true', () => {
    expect(ORDER_TABS.find((t) => t.key === 'all')?.countable).toBe(false);
    for (const key of ['to-pay', 'to-ship', 'to-receive', 'review'] as const) {
      expect(ORDER_TABS.find((t) => t.key === key)?.countable).toBe(true);
    }
  });

  it('review tab 用 tabDelivered labelKey（显示「已送达」非 status.delivered「已完成」）', () => {
    // Why: 决策 1 —— 前三个 tab 是 To Pay/Ship/Receive 动宾结构，「已完成」破坏一致性
    const review = ORDER_TABS.find((t) => t.key === 'review');
    expect(review?.labelKey).toBe('order.tabDelivered');
  });

  it('每个业务 tab 的 labelKey 都存在（防 i18n key 拼错）', () => {
    for (const tab of ORDER_TABS) {
      if (tab.key === 'all') continue;
      expect(tab.labelKey).toMatch(/^order\./);
      expect(tab.labelKey.length).toBeGreaterThan('order.'.length);
    }
  });
});
