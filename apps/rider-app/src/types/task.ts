import type { Coordinates } from './common';

// 后端 DeliveryTaskView 真实字段（来源：api/api-types.ts 的 /rider/dispatch/tasks 端点）
export type TaskStatus =
  | 'PENDING_ASSIGN'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'FAILED';

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
