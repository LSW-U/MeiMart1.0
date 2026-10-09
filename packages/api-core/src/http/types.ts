import type { AxiosRequestConfig } from 'axios';

/**
 * 批4（任务书 1）：包级网络层共享类型与默认值。
 * 端侧差异（token 存储 adapter / locale / authStore 内存镜像 / 错误分型）全部参数化注入，
 * 包内不感知端侧平台与环境（mock 判据/env 读取保持端侧，批3 已定）。
 */

/** 平台无关 KV 存取 adapter —— 端侧注入（client: SecureStore/AsyncStorage；rider: 懒加载 SecureStore/localStorage） */
export interface TokenStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
}

export interface CreateTokenStorageOptions {
  /** 存储 key —— 端侧只传值（验收⑤：key 定义全仓每端 1 处，包内参数接收） */
  tokenKey: string;
  refreshKey: string;
  adapter: TokenStorageAdapter;
}

export interface TokenStorage {
  get(): Promise<string | null>;
  set(token: string, refreshToken: string): Promise<void>;
  /** 只写 access token、不动 refreshToken（rider D6 批4 最小修语义，接口级保留） */
  setAccess(token: string): Promise<void>;
  getRefresh(): Promise<string | null>;
  clear(): Promise<void>;
}

/**
 * tokenStorage 工厂：get/set/setAccess/getRefresh/clear 接口对齐两端现有语义。
 * 异常兜底（读失败返 null / 写失败静默）与两端现行为一致。
 */
export function createTokenStorage(options: CreateTokenStorageOptions): TokenStorage {
  const { tokenKey, refreshKey, adapter } = options;
  return {
    async get(): Promise<string | null> {
      try {
        return await adapter.getItem(tokenKey);
      } catch {
        return null;
      }
    },
    async set(token: string, refreshToken: string): Promise<void> {
      // N-P1-2：写失败静默（头注释承诺），对齐 get/getRefresh 读兜底
      try {
        await adapter.setItem(tokenKey, token);
        await adapter.setItem(refreshKey, refreshToken);
      } catch {
        // 静默：存储写失败不阻断调用链（登出清理等场景不能因存储异常二次抛错）
      }
    },
    async setAccess(token: string): Promise<void> {
      try {
        await adapter.setItem(tokenKey, token);
      } catch {
        // 静默：同 set
      }
    },
    async getRefresh(): Promise<string | null> {
      try {
        return await adapter.getItem(refreshKey);
      } catch {
        return null;
      }
    },
    async clear(): Promise<void> {
      try {
        await adapter.deleteItem(tokenKey);
        await adapter.deleteItem(refreshKey);
      } catch {
        // 静默：同 set
      }
    },
  };
}

/** 两端敏感键集并集（rider 多 'code'；N-P2-3 补 accessToken/Authorization/phone）—— redact() 单源使用 */
export const SENSITIVE_KEYS = [
  'password',
  'smsCode',
  'code',
  'token',
  'refreshToken',
  'accessToken',
  'Authorization',
  'phone',
  'secret',
];

/**
 * 批4（任务书 1）：递归脱敏（替代两端浅拷贝顶层版 sanitizeLogPayload）。
 * 覆盖嵌套对象/数组；循环/深嵌套引用用 depth 封顶（8 层）防炸
 *（N-P2-3 注释对齐：原注释写 WeakSet，实现是深度上限——改注释服从实现）。
 */
export function redact(payload: unknown, depth = 0): unknown {
  if (depth > 8) return '[max-depth]';
  if (typeof payload !== 'object' || payload === null) return payload;
  if (Array.isArray(payload)) {
    return payload.map((item) => redact(item, depth + 1));
  }
  const source = payload as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    if (SENSITIVE_KEYS.includes(key)) {
      out[key] = '***';
    } else {
      out[key] = redact(source[key], depth + 1);
    }
  }
  return out;
}

/** 两端错误分型统一（对齐 rider 现有 ApiError；client 调用方渐进迁移） */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface CreateApiClientOptions {
  baseURL: string;
  timeout?: number;
  /** 端侧 tokenStorage（createTokenStorage 产物） */
  tokenStorage: TokenStorage;
  /** 请求头 access token 解析（client: authStore ?? storage；rider: 内存镜像 ?? storage） */
  getAccessToken?: () => string | null | Promise<string | null>;
  /** Accept-Language 请求头（client 有 / rider 无——不传即不加） */
  getLocale?: () => string;
  /** T4：auth 端点排除前缀（对它们的 401 做 refresh 无意义），默认 ['/common/auth/'] */
  authEndpointPrefixes?: string[];
  /** refresh 失败回调（rider onUnauthorizedCallback） */
  onUnauthorized?: () => void;
  /** refresh 成功回调（client: authStore.setAuth 镜像；rider: authTokenMemory 镜像） */
  onTokenRefreshed?: (token: string) => void | Promise<void>;
  /** true: 非 401 错误抛 ApiError（rider 现行为）；false: 透传 axios 原始 error（client 现行为，渐进迁移） */
  throwApiError?: boolean;
  /** dev 日志开关（两端均为 __DEV__，包内不感知——由端侧传入） */
  debugLog?: boolean;
  /** 测试/扩展点：透传给 axios.create（单测注入 adapter） */
  axiosConfig?: AxiosRequestConfig;
}

export interface ApiClient {
  /** axios 实例（拦截器已接线）——端侧原 `api` 导出符号 */
  api: import('axios').AxiosInstance;
  /**
   * 单一 refresh 单飞（D14/M1）：并发 401 共享同一 refreshPromise，仅 1 次网络请求。
   * 显式导出语义保留——rider 离线队列 C17（sync.ts retryAfterTokenRefresh）依赖。
   */
  refreshAccessToken: () => Promise<string | null>;
}
