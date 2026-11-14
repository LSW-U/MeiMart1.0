// 批5 拆分（C-P3-14）：从 app/(main)/profile.tsx 原样搬移的常量与配置数组，行为零变更
import type { Icon } from '@/components/ui/Icon';

type IconSymbol = Parameters<typeof Icon>[0]['symbol'];

// 默认头像 mock（HTML 第 150 行）
export const DEFAULT_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDTkRvY5IQj5crQ9J0WxeHh9B2lcLBNp6NrIk8FZoL0iBqr3sNYwIAnUgGA9a2lhDAGKNs0Y9WP7AFn3BXuHbbNV7ChtSLtV93tdcfLwqA5V1EEjiStXWYL7QF3KOaH2l2PSyl5nStpLu1j2Cein2M6_AQtoHf00DN0oQPQOhhyzWkt_l5Oaz_nW5Iw9W39bkQ1JLpw4LUIxhhdXtyzNK92y_yuLRTLO2aeZVgFGYM2UUOHzMkK6ya9RMSg3S47jxi0Fx098Wwl';

// 原因：红底 banner / primary header / 主按钮上的固定白字。两种模式都是品牌红底，白字正确不变。
// 不可用 colors['on-primary']：dark 模式下 on-primary 翻为 #690005（暗红），叠红底会裂色。
export const ON_PRIMARY = '#ffffff';

export interface OrderEntry {
  // id: OrderGroupKey | 'after-sales'（退款售后非订单状态，放宽 string 让其可加；badge 查 orderCounts 时 'after-sales' 无值不显示）
  id: string;
  // 20261111 审查🟡3：frequentlyBought 迁 DISCOVER_ENTRIES 后从联合类型移除（无 ORDER_ENTRIES 引用）
  labelKey:
    | 'order.allOrders'
    | 'order.statusToPay'
    | 'order.statusToShip'
    | 'order.statusToReceive'
    | 'order.actions.review'
    | 'profile.afterSales';
  icon: IconSymbol;
  route?: string;
}

// 订单入口宫格（HTML 第 170-197 行）- badge 由 useOrderCounts 派生（id 对应 ORDER_COUNT_MAP）
// 用户要求：去掉「待发货」+ 最后加「退款售后」入口（跳 /refunds 列表页）
// 20261109 拍板 A2：常购清单从 FUNCTION_ITEMS 迁入宫格第 5 格（一行 5 格，flex:1 平分；
//   badge 无值不显示，getCount ?? 0 同 'after-sales' 机制）
// 20261109 拍板 C2：售前→售中→售后严格递进（退款售后先于去评价，淘宝式），足迹殿后
// 20261109 拍板：来源参数 from=profile —— orders/refunds 返回钮凭此确定性回 profile
//   （orders 组内 push 降级、refunds web 直开均会断栈，canGoBack 判断不可靠）
// 20261110 拍板：插「全部订单」格（原右上角「查看全部」入口迁入宫格）；labelKey 新增
//   order.allOrders（common.all「全部」与 tab 语义有歧义弃用）；badge 无值不显示同 after-sales
// 20261110 二次拍板：全部订单移到去评价后（状态类在前、聚合入口殿后，视觉顺序更顺）
// 20261114 拍板（方案定稿）：待收货前插回「待发货」格（20261109 曾去掉，现恢复）——
//   id/labelKey/route 走既有 to-ship 链路（ORDER_STATUS_GROUPS / useOrderCounts /
//   orders?tab=to-ship 直入）零新增 i18n；宫格 5→6 格同行 flex:1 平分
// 20261111 拍板：常购清单迁出宫格 → 发现模块（浏览行为与订单状态语义分家）；宫格剩
//   5 格一行摆满，横向滑动整体删除（CELL_INTERVAL/snapToInterval 随之删）
//   ↑ 20261114 起 6 格，摆满假设由 5 改 6
export const ORDER_ENTRIES: OrderEntry[] = [
  {
    id: 'to-pay',
    labelKey: 'order.statusToPay',
    icon: 'account_balance_wallet',
    route: '/orders?tab=to-pay&from=profile',
  },
  {
    id: 'to-ship',
    labelKey: 'order.statusToShip',
    icon: 'inventory_2',
    route: '/orders?tab=to-ship&from=profile',
  },
  {
    id: 'to-receive',
    labelKey: 'order.statusToReceive',
    icon: 'local_shipping',
    route: '/orders?tab=to-receive&from=profile',
  },
  {
    id: 'after-sales',
    labelKey: 'profile.afterSales',
    icon: 'cash_refund',
    route: '/refunds?from=profile',
  },
  {
    id: 'review',
    labelKey: 'order.actions.review',
    icon: 'rate_review',
    route: '/orders?tab=review&from=profile',
  },
  {
    id: 'all',
    labelKey: 'order.allOrders',
    icon: 'receipt_long',
    route: '/orders',
  },
];

export interface FunctionItem {
  id: string;
  labelKey: string;
  icon: IconSymbol;
  route?: string;
  isError?: boolean;
}

// P2 §3.4: 登录态功能菜单只留 地址/帮助/设置/退出（收藏/优惠券已合并到 usercard 统计条）
// 20261108 拍板：「我的工单」迁出（→ /service 客服页快捷入口，与退款/物流同排；
//   工单=订单异常进度查询，profile 菜单位置语义弱）
// 20261109 拍板 A2：常购清单迁出（→ 订单宫格第 5 格，profile.frequentlyBought key 仍被宫格用非孤儿）
// 20261110 拍板：客服中心从页头右上角迁入本菜单（右上角换扫码入口，见 ProfileHeader）；
//   超出原型的用户决策。插在帮助中心前（客服与帮助语义相邻）
export const FUNCTION_ITEMS: FunctionItem[] = [
  { id: 'address', labelKey: 'address.list', icon: 'location_on', route: '/address/list' },
  {
    id: 'customerService',
    labelKey: 'profile.customerService',
    icon: 'support_agent',
    route: '/service',
  },
  { id: 'help', labelKey: 'profile.help', icon: 'help', route: '/service/help' },
  { id: 'settings', labelKey: 'profile.settings', icon: 'settings', route: '/settings' },
  { id: 'logout', labelKey: 'profile.logout', icon: 'logout', isError: true },
];

// P2 §8: 未登录态无 usercard 统计条 -> 收藏/优惠券入口必须留在功能菜单里
// 20261110 拍板：补客服中心行（客服随 20261110 迁移只剩登录态菜单有入口，未登录用户
//   最需要联系客服；插在帮助中心前与登录态菜单同位序）
export const FUNCTION_ITEMS_EMPTY: FunctionItem[] = [
  { id: 'favorites', labelKey: 'profile.favorites', icon: 'favorite', route: '/favorites' },
  { id: 'coupons', labelKey: 'profile.coupons', icon: 'confirmation_number', route: '/coupons' },
  { id: 'address', labelKey: 'address.list', icon: 'location_on', route: '/address/list' },
  {
    id: 'customerService',
    labelKey: 'profile.customerService',
    icon: 'support_agent',
    route: '/service',
  },
  { id: 'help', labelKey: 'profile.help', icon: 'help', route: '/service/help' },
  { id: 'settings', labelKey: 'profile.settings', icon: 'settings', route: '/settings' },
];

// P2 §6: Discover 快捷功能宫格 - C1 仅 UI + toast 占位，功能后续按 F2->F1->F4->F3 实现
// isNew 角标已下线（2026-08-27 用户手调移除两处使用，字段+渲染分支+样式连根清，审查 Q3）
// 20261109 融合拍板：浏览历史删格（并入订单宫格「常购清单」入口 → /product/history 双 tab，
//   B1 本地 AsyncStorage 实现；本格原为 toast 占位无数据源）
// 20261110 拍板：扫码删格迁页头右上角（真实入口语义）；invite 仍「功能开发中」
//   占位——转正需后端 referral 端点，挂账待立项（发现模块扩充挂账 20261110）
// 20261111 审查🟡1 勘误：becomeSeller 格已换 membershipCenter（占位 toast 不变）
// 20261110 补：新增领券中心直达格（route 真实跳转，非占位）——复用 coupons.centerTitle key；
//   与统计条入口语义区分：统计条看券数量（→/coupons），本格领券（→/coupons/claim）
// 20261111 拍板：常购清单从订单宫格迁入本模块（20261109「浏览历史删格并入宫格」随之回摆——
//   浏览行为归发现、订单状态归宫格语义分家）；key/icon/route 全复用零 i18n
export interface DiscoverEntry {
  id: string;
  labelKey: string;
  icon: IconSymbol;
  route?: string;
}
export const DISCOVER_ENTRIES: DiscoverEntry[] = [
  // 20261111 拍板：会员中心换入（原 becomeSeller 占位格；profile.membershipCenter 四语新增）+
  //   invite 与会员中心对调（invite 殿后仍占位）
  {
    id: 'membershipCenter',
    labelKey: 'profile.membershipCenter',
    icon: 'workspace_premium',
  },
  {
    id: 'claimCoupons',
    labelKey: 'coupons.centerTitle',
    icon: 'confirmation_number',
    route: '/coupons/claim',
  },
  {
    id: 'frequentlyBought',
    labelKey: 'profile.frequentlyBought',
    icon: 'history',
    route: '/product/history',
  },
  // 20261114 拍板：invite 格改「去评价」真实入口（/orders?tab=review 直入）——invite 迁
  //   领券中心页底部入口卡（profile.invite key 迁移不删，无孤儿）；占位 toast 语义随之消失
  {
    id: 'review',
    labelKey: 'order.actions.review',
    icon: 'rate_review',
    route: '/orders?tab=review&from=profile',
  },
];
