import { createApiClient, ApiError, type ApiClient } from '@meimart/api-core';
import { getExtra } from '../config/app-config';
import { tokenStorage } from './token-storage';

// 批3 A10：env 从 process.env.EXPO_PUBLIC_* 迁 expo-constants extra（app.config.ts 注入）
export const API_BASE_URL = getExtra()?.API_BASE_URL ?? '';

// mock 模式开关（审查批次一 P2-1 修复，2026-08-28）：
// 显式读 USE_MOCK（与 client-app api.ts 对齐），默认缺省 → mock。
// 原判据「URL 为空 → mock」的失败模式是：EAS/生产漏配 URL → 静默全量 mock 假数据，
// 骑手长时间无感知。改为显式开关后，漏配 URL 时 URL 为空但 USE_MOCK 未开 →
// 走 real 分支打空 baseURL 报错（显式失败），不再静默吞。
// 想开 mock：.env 设 EXPO_PUBLIC_USE_MOCK=true（或不设=默认 mock，本地开发免配）。
// 批4：mock 判据与环境读取保持端侧（任务书 4，批3 已定），不迁入包。
export const isMockMode = (getExtra()?.USE_MOCK ?? '') !== 'false' && API_BASE_URL.length === 0;

// 批4（任务书 3）：包级 ApiError 单源（对齐原本地实现，符号/构造签名不变）
export { ApiError };

// ── 兼容层：旧的内存 token API（C17/A.2 阶段语义保留，逐步淘汰） ──────────

let authTokenMemory: string | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

// 前端接线切换 T5：setAuthToken/getAuthToken 已删（全仓 0 调用方，D2 拍板）。
// ⚠️ 红线：authTokenMemory 不能删——tokenAdapter getAccessToken 镜像 + onTokenRefreshed
// 回写仍消费（下方 createApiClient），11 个 service 经 api 实例间接依赖。
// setOnUnauthorized 保留：唯一调用方 app/_layout.tsx:47（登出回调接管），调用方迁移后再删（挂账）。
export function setOnUnauthorized(cb: (() => void) | null) {
  onUnauthorizedCallback = cb;
}

// ── api-core 接线（批4 任务书 3）──────────────────────────────────────
//
// 端侧差异注入：内存镜像 get/set（兼容层 authTokenMemory，11 个 service 仍用）、
// onUnauthorized 回调、非 401 抛 ApiError（throwApiError，旧 request() 行为）。
// 单飞 refresh 由包内实现；refreshAccessToken 显式再导出（C17 离线队列依赖，语义保留）。

// 批4 验收⑤：key 定义点收敛——'mei-delivery.*' key 只在 token-storage.ts 定义 1 处，
// 此处复用同一实例（不二次 createTokenStorage）。
const client: ApiClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStorage,
  getAccessToken: () => authTokenMemory,
  onUnauthorized: () => onUnauthorizedCallback?.(),
  onTokenRefreshed: (token) => {
    authTokenMemory = token;
  },
  throwApiError: true,
  debugLog: __DEV__,
});

export const api = client.api;

/** C17（R-P2-15 拍板②）：显式刷新入口——离线队列 dispatch 收到 401 时先刷新重试一次，
 * 仍失败才死信（sync.ts retryAfterTokenRefresh 消费）。单飞实现在包内（批4 D14）。 */
export const refreshAccessToken = client.refreshAccessToken;

export function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '';
  return (
    '?' +
    entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
  );
}
