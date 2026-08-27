import type { Coordinates } from './common';

// 后端 DeliveryTaskView 真实字段（来源：api/api-types.ts 的 /rider/dispatch/tasks 端点）
export type TaskStatus =
  | 'PENDING_ASSIGN'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'FAILED';

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
  /** T6 联系拨号：客户电话（后端从 order.deliveryAddress.phone 透传，历史订单可能无） */
  contactPhone?: string;
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
  /**
   * 预估配送时长（分钟，P6 #7 2026-08-25）
   * 由 distanceKm ÷ 20km/h 推导，上限 45 分钟兜底；distanceKm 缺失 → undefined。
   */
  estimatedMinutes?: number;
  // ── 兼容字段（旧 UI 引用 task.pickup.title / task.fee 等） ──
  // service 层 fromView() 保证 real 模式也填充这些字段。
  // P0-1/P6 #7 修复（2026-08-25）：fee/distanceKm/estimatedMinutes 已由后端透传，
  //   fromView 直接复用后端值（缺失才回退 0）；不再依赖 mock 假数据。
  pickup: TaskStop;
  dropoff: TaskStop;
  fee: number;
  items: string[];
};

// Report issue 端点的 reason 枚举
export type ReportIssueReason =
  | 'CUSTOMER_UNREACHABLE'
  | 'CUSTOMER_REJECTED'
  | 'ADDRESS_NOT_FOUND'
  | 'TRAFFIC_ACCIDENT'
  | 'OTHER';
