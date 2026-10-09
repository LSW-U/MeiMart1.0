import {
  create as axiosCreate,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import {
  ApiError,
  redact,
  type ApiClient,
  type CreateApiClientOptions,
} from './types';

export type { ApiClient, CreateApiClientOptions };

/**
 * 批4（任务书 1）：axios 实例工厂 + 单一 refresh 单飞（D14/M1）。
 * 以两端现有实现为蓝本收口：
 *   - 请求拦截器：内存/存储 token 注入 Authorization + Accept-Language + dev 脱敏日志
 *   - 响应拦截器：{ success, data } 壳剥层 + 401 单飞 refresh 重试（队列层删除，直接共享
 *     refreshPromise——并发 401 等待的是同一个 Promise，flushQueue 层冗余消除）
 *   - T4 isAuthEndpoint 排除纳入包行为（参数化前缀，默认 '/common/auth/'）
 *   - N-P1-1（方案A）：refresh 副作用（tokenStorage.set / onTokenRefreshed）抛错可 reject，
 *     调用方拿原始 Error，不经 throwApiError 分型（两端调用方均为泛型 catch）
 *     ⚠️ 方案A后 refresh 副作用抛错可 reject，调用方拿原始 Error，不经 throwApiError
 */
export function createApiClient(options: CreateApiClientOptions): ApiClient {
  const {
    baseURL,
    timeout = 15000,
    tokenStorage,
    getAccessToken,
    getLocale,
    authEndpointPrefixes = ['/common/auth/'],
    onUnauthorized,
    onTokenRefreshed,
    throwApiError = false,
    debugLog = false,
    axiosConfig,
  } = options;

  const api = axiosCreate({
    baseURL,
    timeout,
    headers: { 'Content-Type': 'application/json' },
    ...axiosConfig,
  });

  // ── 单一 refresh 单飞 ──────────────────────────────────────────────
  let refreshPromise: Promise<string | null> | null = null;

  const refreshAccessToken = (): Promise<string | null> => {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      const refreshToken = await tokenStorage.getRefresh();
      if (!refreshToken) return null;
      // N-P1-1（D1 方案A）：仅网络请求在 try 内——tokenStorage.set / onTokenRefreshed
      // 等副作用移出（N-P1-2 落地后写失败本就静默），副作用抛错不得误触发 clear+登出
      let newToken: string;
      let newRefresh: string;
      try {
        const res = await api.post<{ accessToken: string; refreshToken: string }>(
          '/common/auth/refresh',
          { refreshToken },
        );
        newToken = res.data.accessToken;
        newRefresh = res.data.refreshToken;
      } catch {
        await tokenStorage.clear();
        onUnauthorized?.();
        return null;
      }
      await tokenStorage.set(newToken, newRefresh);
      await onTokenRefreshed?.(newToken);
      return newToken;
    })();
    // N-P1-1：副作用抛错时也复位单飞槽位（reject 仍向调用方传播）——
    // 前置 .catch 吞掉副本，.finally 复位不会成 unhandledRejection；单链单回调无微任务缝隙
    void refreshPromise
      // 吞掉 rejection 的副本；原 promise 的 reject 仍传播给已挂 then 的调用方
      //（副本返回值无人消费，直接 null，省掉双重断言）
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
    return refreshPromise;
  };

  // ── 请求拦截器 ─────────────────────────────────────────────────────
  api.interceptors.request.use(async (config) => {
    const memoryToken = getAccessToken?.();
    const token =
      memoryToken instanceof Promise ? await memoryToken : (memoryToken ?? (await tokenStorage.get()));
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (getLocale) {
      config.headers = config.headers ?? {};
      config.headers['Accept-Language'] = getLocale();
    }
    if (debugLog && config.data) {
      console.debug('[api request]', config.method, config.url, redact(config.data));
    }
    return config;
  });

  // ── 响应拦截器 ─────────────────────────────────────────────────────
  api.interceptors.response.use(
    (response) => {
      // 后端统一 { success, data, error? } 包裹端点剥层（auth 端点无包裹自动跳过）——两端同构
      const body = response.data as { success?: unknown; data?: unknown } | undefined;
      if (body && typeof body === 'object' && 'success' in body && typeof body.success === 'boolean') {
        response.data = body.data;
      }
      return response;
    },
    async (error: AxiosError) => {
      const original = error.config as
        | (InternalAxiosRequestConfig & { _retry?: boolean })
        | undefined;
      const status = error.response?.status;

      // T4: auth 端点（登录/注册/refresh/logout）的 401 不做 refresh（凭据错 vs token 失效）
      const url = original?.url ?? '';
      const isAuthEndpoint = authEndpointPrefixes.some((p) => url.startsWith(p));
      if (status === 401 && original && !original._retry && !isAuthEndpoint) {
        original._retry = true;
        // D14/M1：删队列包裹层——所有并发 401 直接 await 同一个单飞 promise，
        // 拿到各自结果后带新 token 重放（null = refresh 失败，回传原始 error）
        const newToken = await refreshAccessToken();
        if (newToken) {
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original as AxiosRequestConfig);
        }
      }

      if (throwApiError) {
        // rider 语义（批4 审查 P3-1 声明）：原 rider 拦截器在 refresh 失败时裸
        // reject(AxiosError) 绕过 ApiError 分型；批4 起统一抛 ApiError(401,…)。
        // 已核实无回归：sync.ts isPermanentStatus/retryAfterTokenRefresh 对两种类型
        // 结局等价（401 均不判 permanent；e instanceof ApiError && e.status===401
        // 反而更直接命中），其余调用方均为泛型 catch。与 rider 错误分型更一致。
        const raw = error.response?.data as
          | { code?: string; message?: string; error?: { code?: string; message?: string } }
          | undefined;
        const code = raw?.error?.code ?? raw?.code ?? 'UNKNOWN';
        const message =
          raw?.error?.message ?? raw?.message ?? `Request failed: ${status ?? 'unknown'}`;
        throw new ApiError(status ?? 0, code, message);
      }
      // client 现行为：透传 axios 原始 error（调用方渐进迁移 ApiError）
      return Promise.reject(error);
    },
  );

  return { api, refreshAccessToken };
}
