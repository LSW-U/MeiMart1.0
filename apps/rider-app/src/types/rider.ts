import type { Coordinates } from './common';

// 后端 RiderProfileView 真实字段（来源：api/api-types.ts 的 /rider/profile 端点）
export type RiderStatus = 'OFFLINE' | 'ONLINE' | 'BUSY';
export type VehicleType = 'MOTORCYCLE' | 'BICYCLE' | 'CAR';
export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type AcceptMode = 'GRAB' | 'AUTO_DISPATCH';

export type RiderProfile = {
  id: string;
  userId: string;
  riderName: string;
  phone: string;
  vehicleType: VehicleType;
  vehiclePlate: string | null;
  status: RiderStatus;
  applicationStatus: ApplicationStatus;
  totalDeliveries: number;
  rating: number;
  preferredWarehouseIds: string[];
  isOnline: boolean;
  createdAt: string;
  updatedAt: string;
  // ── 兼容字段（旧 UI 引用，real 模式后端不返回，留 undefined） ──
  avatarUrl?: string;
  bondPaid?: boolean;
  currentTaskId?: string;
  currentLocation?: Coordinates;
  // 旧 UI 用 name / licenseNumber，迁移期映射到新字段
  name?: string;
  licenseNumber?: string;
};

// Apply 端点请求 body
export type ApplyRiderPayload = {
  riderName: string;
  phone: string;
  vehicleType?: VehicleType;
  vehiclePlate?: string;
  idCardNumber: string;
  preferredWarehouseIds?: string[];
};

// UpdateDuty 端点请求 body
export type UpdateDutyPayload = {
  status: RiderStatus;
  acceptMode?: AcceptMode;
};
