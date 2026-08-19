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
  // ── 兼容字段（旧 UI 引用 task.pickup.title / task.fee 等） ──
  // service 层 fromView() 保证 real 模式也填充这些字段（缺失时填默认空值）
  pickup: TaskStop;
  dropoff: TaskStop;
  fee: number;
  distanceKm: number;
  estimatedMinutes: number;
  items: string[];
};

// Report issue 端点的 reason 枚举
export type ReportIssueReason =
  | 'CUSTOMER_UNREACHABLE'
  | 'CUSTOMER_REJECTED'
  | 'ADDRESS_NOT_FOUND'
  | 'TRAFFIC_ACCIDENT'
  | 'OTHER';
