// 20261114 profile 宫格改造：订单宫格插「待发货」(6 格) + 发现宫格 invite 格改「去评价」。
// 结构断言（entry 定义是纯数据，渲染交互由既有 payment-preference-profile 等覆盖）。
// Why 走 node require + path.resolve 拼：jest-resolve 对相对路径中的 `(main)` 括号段
//   解析失败（20261114 实测，moduleDirectories/haste 均无关），node 原生 require 无此问题。
// Why 绕 jest-resolve：相对路径里的 `(main)` 括号段在 jest-expo resolver 下解析失败
//   （20261114 实测），node 原生 require 无此问题。app/ 在 client-app 根（非 src/ 下），
//   故 src/test/pages → 上三级。类型经 declare 取（tsconfig types 无 node，无 path/__dirname 类型）。
const { ORDER_ENTRIES, DISCOVER_ENTRIES } =
  require('../../../app/(main)/profile-sections/shared.ts') as {
    ORDER_ENTRIES: { id: string; labelKey: string; icon: string; route?: string }[];
    DISCOVER_ENTRIES: { id: string; labelKey: string; icon: string; route?: string }[];
  };

describe('profile 宫格 20261114 改造（待发货格回归 + 去评价迁发现区）', () => {
  it('订单宫格：待发货在待付款之后、待收货之前（20261114 补拍板：原去评价格随迁发现区删除，宫格 5 格）', () => {
    const ids = ORDER_ENTRIES.map((e) => e.id);
    expect(ids).toEqual(['to-pay', 'to-ship', 'to-receive', 'after-sales', 'all']);
  });

  it('待发货格：labelKey=order.statusToShip、icon、route 带 tab=to-ship&from=profile', () => {
    const entry = ORDER_ENTRIES.find((e) => e.id === 'to-ship');
    expect(entry).toBeDefined();
    expect(entry!.labelKey).toBe('order.statusToShip');
    expect(entry!.icon).toBe('inventory_2');
    expect(entry!.route).toBe('/orders?tab=to-ship&from=profile');
  });

  it('发现宫格：invite 已移除，去评价格迁入接 /orders?tab=review&from=profile（订单宫格原 review 格删除）', () => {
    expect(ORDER_ENTRIES.map((e) => e.id)).not.toContain('review');
    const ids = DISCOVER_ENTRIES.map((e) => e.id);
    expect(ids).not.toContain('invite');
    const review = DISCOVER_ENTRIES.find((e) => e.id === 'review');
    expect(review).toBeDefined();
    expect(review!.labelKey).toBe('order.actions.review');
    expect(review!.route).toBe('/orders?tab=review&from=profile');
  });

  it('i18n：statusToShip / actions.review / profile.invite+inviteDesc 四语 key 均存在', () => {
    const zh = require('../../../locales/zh.json') as Record<string, any>;
    const en = require('../../../locales/en.json') as Record<string, any>;
    const pt = require('../../../locales/pt.json') as Record<string, any>;
    const tet = require('../../../locales/tet.json') as Record<string, any>;
    for (const d of [zh, en, pt, tet]) {
      expect(d.order.statusToShip).toBeTruthy();
      expect(d.order.actions.review).toBeTruthy();
      expect(d.profile.invite).toBeTruthy();
      expect(d.profile.inviteDesc).toBeTruthy(); // 领券中心入口卡描述（本批新增）
    }
    expect(zh.profile.inviteDesc).not.toEqual(en.profile.inviteDesc); // 非占位
  });
});
