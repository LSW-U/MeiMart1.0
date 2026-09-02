/**
 * 保证金服务（批 G，2026-09-03）— 消费后端批 B 三端点
 *
 * real 模式：
 *   GET  /rider/deposit/status            余额/命中档位/最近申请
 *   POST /rider/deposit/requests          提交申请（ONLINE_MOCK | OFFLINE_COD）
 *   POST /rider/deposit/requests/:id/pay-mock  线上模拟支付（即时生效）
 *
 * mock 模式：localStorage 状态机（未缴 → 线上即时生效 / 线下 PENDING → 确认），
 *   供 UI 三态开发与单测（HTML 原型「前端可先行」原则）。
 *
 * 补端点批（2026-09-03）新增：
 *   GET  /rider/deposit/locations         启用缴纳点（COD 下拉，字段收窄）
 *   GET  /rider/deposit/tiers             启用档位（缴纳提示「选 $X → 上限 $Y」）
 */
import { api, isMockMode } from './api';

// ── 类型（与后端契约 packages/api-contract/src/schemas/rider.ts 同步）──

export type DepositChannel = 'ONLINE_MOCK' | 'OFFLINE_COD';
export type DepositStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'REFUNDED';

export interface DepositTier {
  id: string;
  minAmount: number;
  maxOrderAmount: number | null;
  sortOrder: number;
  enabled: boolean;
}

/** 缴纳点（骑手端 GET /rider/deposit/locations 待后端补充；类型先行对齐 admin 契约） */
export interface DepositLocation {
  id: string;
  name: string;
  address: string;
  note: string | null;
  enabled: boolean;
}

export interface DepositRecord {
  id: string;
  channel: DepositChannel;
  /** 申请额（分） */
  requestedAmount: number;
  /** 确认额（分）；PENDING 为 null */
  confirmedAmount: number | null;
  status: DepositStatus;
  locationId: string | null;
  note: string | null;
  adminNote: string | null;
  createdAt: string;
  paidAt: string | null;
  confirmedAt: string | null;
}

export interface DepositStatusResponse {
  /** 生效保证金总额（分） */
  depositAmount: number;
  /** 命中档位；null = 未缴/无命中（停用档回落） */
  tier: DepositTier | null;
  /** 最近申请（后端 take 10） */
  recentRequests: DepositRecord[];
}

export interface CreateDepositPayload {
  channel: DepositChannel;
  /** 金额（分，≥100） */
  amount: number;
  locationId?: string;
  note?: string;
}

export interface PayMockResult {
  deposit: DepositRecord;
  depositAmount: number;
}

// ── Mock 层（localStorage，Web dev / 单测）───────────────────────────

const mockStorageKey = 'mei-delivery-app:deposit-state';

/** mock 缴纳点（仅 UI 演示；real 模式不消费） */
const MOCK_LOCATIONS: DepositLocation[] = [
  {
    id: 'loc-dili',
    name: 'Dili Office',
    address: 'Av. Bispo Medeiros, Dili',
    note: 'Main office',
    enabled: true,
  },
  { id: 'loc-baucau', name: 'Baucau Office', address: 'Baucau', note: null, enabled: true },
  { id: 'loc-maliana', name: 'Maliana Office', address: 'Maliana', note: null, enabled: true },
];

/** mock 档位（与后端 seed 同构：$1→$10/$5→$50/$10→$100/$50→$500） */
const MOCK_TIERS: DepositTier[] = [
  { id: 't1', minAmount: 100, maxOrderAmount: 1000, sortOrder: 1, enabled: true },
  { id: 't2', minAmount: 500, maxOrderAmount: 5000, sortOrder: 2, enabled: true },
  { id: 't3', minAmount: 1000, maxOrderAmount: 10000, sortOrder: 3, enabled: true },
  { id: 't4', minAmount: 5000, maxOrderAmount: 50000, sortOrder: 4, enabled: true },
];

interface MockDepositState {
  depositAmount: number;
  records: DepositRecord[];
}

/**
 * mock 状态存储：localStorage 优先（Web dev 跨刷新保留）；不可用（RN 真机 /
 * node 测试环境）回退进程内内存态——否则 write 静默丢、read 恒空（单测踩坑）。
 */
let memoryMockState: MockDepositState | null = null;

function readMockState(): MockDepositState {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(mockStorageKey);
    if (stored) return JSON.parse(stored) as MockDepositState;
  }
  return memoryMockState ?? { depositAmount: 0, records: [] };
}

function writeMockState(state: MockDepositState): void {
  memoryMockState = state;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(mockStorageKey, JSON.stringify(state));
  }
}

/** mock 状态辅助（单测用）：直接重置 */
export function resetMockDepositState(): void {
  memoryMockState = null;
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(mockStorageKey);
  }
}

function mockDelay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function deriveMockTier(depositAmount: number): DepositTier | null {
  return (
    MOCK_TIERS.filter((t) => t.enabled && t.minAmount <= depositAmount).sort(
      (a, b) => b.minAmount - a.minAmount,
    )[0] ?? null
  );
}

/** mock locations（Web dev 演示；real 走 /rider/deposit/locations 真端点，补端点批已接） */
export const mockDepositLocations = MOCK_LOCATIONS;
export const mockDepositTiers = MOCK_TIERS;

// ── depositApi ──────────────────────────────────────────────────────

export const depositApi = {
  /** 状态查询（余额 + 命中档位 + 最近申请） */
  async getStatus(): Promise<DepositStatusResponse> {
    if (isMockMode) {
      const state = readMockState();
      return mockDelay({
        depositAmount: state.depositAmount,
        tier: deriveMockTier(state.depositAmount),
        recentRequests: state.records.slice(0, 10),
      });
    }
    const res = await api.get<DepositStatusResponse>('/rider/deposit/status');
    return res.data;
  },

  /** 提交缴纳申请（线上待 pay-mock；线下 PENDING 待 admin 确认） */
  async createRequest(payload: CreateDepositPayload): Promise<DepositRecord> {
    if (isMockMode) {
      const state = readMockState();
      const record: DepositRecord = {
        id: `mock-dep-${Date.now()}`,
        channel: payload.channel,
        requestedAmount: payload.amount,
        confirmedAmount: null,
        status: 'PENDING',
        locationId: payload.locationId ?? null,
        note: payload.note ?? null,
        adminNote: null,
        createdAt: new Date().toISOString(),
        paidAt: null,
        confirmedAt: null,
      };
      writeMockState({ ...state, records: [record, ...state.records] });
      return mockDelay(record);
    }
    const res = await api.post<DepositRecord>('/rider/deposit/requests', payload);
    return res.data;
  },

  /** 线上模拟支付（ONLINE_MOCK + PENDING → CONFIRMED，余额即时累加；幂等） */
  async payMock(requestId: string): Promise<PayMockResult> {
    if (isMockMode) {
      const state = readMockState();
      const record = state.records.find((r) => r.id === requestId);
      if (!record) throw new Error('deposit request not found');
      // 幂等：已 CONFIRMED 直接返回
      if (record.status === 'CONFIRMED') {
        return mockDelay({ deposit: record, depositAmount: state.depositAmount });
      }
      if (record.status !== 'PENDING') {
        throw new Error(`cannot pay-mock a ${record.status} deposit`);
      }
      const now = new Date().toISOString();
      const confirmed: DepositRecord = {
        ...record,
        status: 'CONFIRMED',
        confirmedAmount: record.requestedAmount,
        paidAt: now,
        confirmedAt: now,
      };
      const depositAmount = state.depositAmount + record.requestedAmount;
      writeMockState({
        depositAmount,
        records: state.records.map((r) => (r.id === requestId ? confirmed : r)),
      });
      return mockDelay({ deposit: confirmed, depositAmount });
    }
    const res = await api.post<PayMockResult>(`/rider/deposit/requests/${requestId}/pay-mock`);
    return res.data;
  },

  /**
   * 启用缴纳点列表（线下 COD Tab 下拉）
   * 补端点批（2026-09-03）：后端已提供骑手端只读端点（字段收窄 id/name/address/note）。
   */
  async getLocations(): Promise<DepositLocation[]> {
    if (isMockMode) {
      return mockDelay(MOCK_LOCATIONS.filter((l) => l.enabled));
    }
    const res = await api.get<RiderDepositLocationItem[]>('/rider/deposit/locations');
    // 契约字段收窄无 enabled——补 enabled: true（与 admin 侧类型对齐，下游无感）
    return res.data.map((l) => ({ ...l, enabled: true }));
  },

  /**
   * 启用档位列表（缴纳页「选 $X → 上限 $Y」提示）
   * 补端点批（2026-09-03）：与资格派生同口径（enabled 过滤，sortOrder 升序）。
   */
  async getTiers(): Promise<DepositTier[]> {
    if (isMockMode) {
      return mockDelay([...MOCK_TIERS]);
    }
    const res = await api.get<DepositTier[]>('/rider/deposit/tiers');
    return res.data;
  },
};

/** 骑手端缴纳点行（契约字段收窄：id/name/address/note） */
export interface RiderDepositLocationItem {
  id: string;
  name: string;
  address: string;
  note: string | null;
}
