import type { Coordinates } from './common';

// 后端 DeliveryTaskView 真实字段（来源：packages/api-contract 生成的 openapi 类型，/rider/dispatch/tasks 端点）
export type TaskStatus =
  'PENDING_ASSIGN' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERING' | 'DELIVERED' | 'FAILED';

/**
 * P14 ④：任务类型
 * - delivery：普通配送（两步 PICKED_UP→DELIVERED，跳过 DELIVERING）
 * - return：退货取件（三步 PICKED_UP→DELIVERING→DELIVERED，startDelivering 写 refund.pickedAt）
 */
export type TaskType = 'delivery' | 'return';

export type TaskStop = {
  title: string;
  address: string;
  coordinates?: Coordinates;
  contactName?: string;
  contactPhone?: string;
  lat?: number;
  lng?: number;
};

export type DeliveryTask = {
  // ── 后端真实字段（DeliveryTaskView） ──
  id: string;
  orderId: string;
  riderId: string | null;
  warehouseId: string;
  status: TaskStatus;
  /** P14 ④：任务类型（delivery 配送 / return 退货取件） */
  taskType: TaskType;
  /** P14 ④：return 任务关联的 refund（delivery 为 null） */
  refundId: string | null;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  /** COD 判断依据（'COD' 时 sign 页要求输入实收金额，单位：分） */
  paymentMethod?: string;
  /** 订单应付金额（COD 实收参考，单位：分） */
  payableAmount?: number;
  /**
   * 业务订单号（MMxxx，大厅卡 20261114 补显用）。
   * ⚠️ orderId 是 delivery_tasks.order_id 内部 UUID 外键（7c47aacc-… 形态），
   * 不适合展示；orderNo 才是骑手到店报单号用的业务单号。
   * 后端 toView 已透传（dispatch.service.ts orderNo: t.order.orderNo），但
   * api-contract 的 rider DeliveryTask schema 未声明（admin 视角 TaskOrderSummary 才有）——
   * 前端防御性可选，缺失（历史单/契约滞后）回退 orderId。
   */
  orderNo?: string;
  /** T6 联系拨号：客户电话（后端从 order.deliveryAddress.phone 透传，历史订单可能无） */
  contactPhone?: string;
  /** 仓库名多语言包（后端 warehouses.name jsonb，en/id/pt/zh/tet；按 locale 自取，断链/旧数据 null） */
  pickupTitleI18n?: Record<string, string> | null;
  /** 收件人姓名（后端从 order.deliveryAddress.name 透传，历史订单可能无） */
  dropoffContactName?: string;
  /**
   * 配送费（单位：分，P0-1 修复 2026-08-25）
   * 后端从 order.deliveryFee 透传；历史订单可能无 → undefined。
   * fromView 映射到 fee 兼容字段（旧 UI 消费 task.fee）。
   */
  deliveryFee?: number;
  /**
   * 配送费基础费（单位：分，距离计费批次1 2026-08-27）
   * 从 order.delivery_fee_breakdown.baseFee 透传（订单快照）。
   * breakdown 缺失（历史单/无坐标）→ undefined，卡片只显总额不显明细。
   */
  baseFee?: number;
  /**
   * 配送费距离加价（单位：分，距离计费批次1 2026-08-27）
   * 从 order.delivery_fee_breakdown.distanceFee 透传（订单快照）。
   * 与 baseFee 一起展示明细「基础 $X + 距离 $Y」。
   */
  distanceFee?: number;
  /**
   * 计费距离（km，距离计费批次1 2026-08-27 / P2-2 审查报告修复）
   * 从 order.delivery_fee_breakdown.distanceKm 透传 = PostGIS ST_DistanceSphere(仓库中心→收货地址)。
   * 与 distanceKm 语义不同：distanceKm = pickup→dropoff Haversine（骑行距离，ETA 用），
   *                          billingDistanceKm = 仓库→地址 球面距离（距离费计算基准）。
   * breakdown 缺失 → undefined（前端降级隐藏「计费距离」展示，仍显骑行距离）。
   */
  billingDistanceKm?: number;
  /**
   * 配送直线距离（km，P6 #7 2026-08-25）
   * pickup → dropoff 的 Haversine 距离；任一坐标缺失 → undefined（前端降级隐藏）。
   */
  distanceKm?: number;
  /** 预估配送时长（分钟，P6 #7 2026-08-25）
   * 由 distanceKm ÷ 20km/h 推导，上限 45 分钟兜底；distanceKm 缺失 → undefined。
   */
  estimatedMinutes?: number;
  /**
   * 商品摘要（骑手大厅卡片 20261115）：totalQty=总件数（Σ quantity），kinds=去重 SKU 数。
   * 后端从 order.items 派生；未 include（历史单/契约滞后）→ undefined，卡片降级隐藏。
   * 行业惯例：接单决策看件数不看明细，无商品图片。
   */
  itemsSummary?: { totalQty: number; kinds: number };
  /**
   * 批B B3（保证金批A T5-c 契约同步 2026-09-11）：预约单开门时间（打烊时段下单的
   * 该仓下一次开门时间；即时单 null/undefined）。
   * 防御性可选字段：后端 DeliveryTaskView 当前未透传 scheduledFor（后端大厅/候选已按
   * 开门时间过滤——预约单开门前本就不可见）。后端未来透传时 UI 直接标注「预约单
   * {time} 后可接」，无需再改类型。当前 real/mock 数据恒 undefined → 标注不渲染。
   */
  scheduledFor?: string | null;
  /**
   * 送达 deadline 锚点（ISO，骑手大厅卡片-后端配合需求②/⑤B 20261115）。
   * 来源 delivery_tasks.estimated_arrival（建单时刻 + 45min 静态值，接单不刷新——
   * 已知瑕疵记录不阻塞，实时 ETA 方案 C 另立项）。
   * 缺失（历史单/契约滞后）→ 前端降级「约 X 分钟」分钟口径文案，绝不报错。
   */
  estimatedArrival?: string | null;
  /**
   * 动态 ETA（ISO 时刻，实时动态 ETA 方案 C 2026-11-17）。
   * 后端读时计算自骑手最新位置（rider:loc Redis → 目标点 Haversine ÷ 20km/h + 缓冲）；
   * 位置不新鲜/键缺失/Redis 异常/非进行中 → null。null/undefined → 前端回退静态死线
   * estimatedArrival（三档降级链原样保留）。
   */
  liveEta?: string | null;
  /**
   * 关联订单状态（F3 已取消订单出口 20261117 立项 B1/B2）。
   * 后端 ORDER_SELECT 单源透传（dispatch.service.ts toView）；CANCELLED →
   * 进行中任务卡渲染「订单已取消」红 badge +「上报异常」入口。
   * 旧数据/契约滞后 → undefined，badge 不渲染（防御性可选）。
   */
  orderStatus?:
    | 'PENDING_PAYMENT'
    | 'PENDING_CONFIRM'
    | 'CONFIRMED'
    | 'PICKED'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED_PAID'
    | 'DELIVERED'
    | 'DELIVERED_UNPAID'
    | 'COMPLETED'
    | 'CANCELLED';
  // ── 兼容字段（旧 UI 引用 task.pickup.title / task.fee 等） ──
  // service 层 fromView() 保证 real 模式也填充这些字段。
  // P0-1/P6 #7 修复（2026-08-25）：fee/distanceKm/estimatedMinutes 已由后端透传，
  //   fromView 直接复用后端值（缺失才回退 0）；不再依赖 mock 假数据。
  pickup: TaskStop;
  dropoff: TaskStop;
  fee: number;
  items: string[];
};

// Report issue 端点的 reason 枚举（F3/§4 20261117 立项 D1：+ORDER_CANCELLED / DEADLINE_OVERDUE_RETURN）
export type ReportIssueReason =
  | 'CUSTOMER_UNREACHABLE'
  | 'CUSTOMER_REJECTED'
  | 'ADDRESS_NOT_FOUND'
  | 'TRAFFIC_ACCIDENT'
  | 'ORDER_CANCELLED'
  | 'DEADLINE_OVERDUE_RETURN'
  | 'OTHER';

/**
 * 替换品批2 工单化（2026-10-29 D20）：reportIssue 响应增量字段（只增不改）。
 * 后端 DeliveryTaskView 本身无此字段——仅 report-issue 端点响应 data 带 ticketNo。
 * 调用方用 `ReportIssueResult`（DeliveryTask + ticketNo）接收回显。
 */
export type ReportIssueResult = DeliveryTask & { ticketNo?: string };
