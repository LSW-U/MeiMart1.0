import {
  create as axiosCreate,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { tokenStorage } from './token-storage';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

// mock 模式：API_BASE_URL 为空时，service 层走 mock 分支（不调 request()）
export const isMockMode = API_BASE_URL.length === 0;

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

// ── axios 实例 + 拦截器 ─────────────────────────────────────────────

export const api = axiosCreate({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = authTokenMemory ?? (await tokenStorage.get());
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (__DEV__ && config.data) {
    console.debug('[api request]', config.method, config.url, sanitizeLogPayload(config.data));
  }
  return config;
});

function sanitizeLogPayload(payload: unknown): unknown {
  if (typeof payload !== 'object' || payload === null) return payload;
  const sensitiveKeys = ['password', 'smsCode', 'code', 'token', 'refreshToken', 'secret'];
  const sanitized = { ...(payload as Record<string, unknown>) };
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.includes(key)) sanitized[key] = '***';
  }
  return sanitized;
}

// ── refresh token 队列（401 自动刷新 + 重试） ─────────────────────────

let refreshPromise: Promise<string | null> | null = null;
let isRefreshing = false;
let pendingQueue: ((token: string | null) => void)[] = [];

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  const refreshToken = await tokenStorage.getRefresh();
  if (!refreshToken) return null;
  refreshPromise = (async () => {
    try {
      const res = await api.post<{ token: string; refreshToken: string }>('/auth/refresh', {
        refreshToken,
      });
      const { token: newToken, refreshToken: newRefresh } = res.data;
      await tokenStorage.set(newToken, newRefresh);
      authTokenMemory = newToken;
      return newToken;
    } catch {
      authTokenMemory = null;
      await tokenStorage.clear();
      onUnauthorizedCallback?.();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

function flushQueue(token: string | null) {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push((token) => {
            if (!token) {
              reject(error);
              return;
            }
            original.headers = original.headers ?? {};
            original.headers.Authorization = `Bearer ${token}`;
            original._retry = true;
            resolve(api(original as AxiosRequestConfig));
          });
        });
      }

      original._retry = true;
      isRefreshing = true;
      try {
        const newToken = await refreshAccessToken();
        flushQueue(newToken);
        if (!newToken) return Promise.reject(error);
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original as AxiosRequestConfig);
      } finally {
        isRefreshing = false;
      }
    }

    // 非 401 或重试失败 → 抛 ApiError（保持旧 request() 行为）
    const body = error.response?.data as { code?: string; message?: string } | undefined;
    const code = body?.code ?? 'UNKNOWN';
    const message = body?.message ?? `Request failed: ${status ?? 'unknown'}`;
    throw new ApiError(status ?? 0, code, message);
  },
);

// ── 兼容层：旧的内存 token API（11 个 service 仍用） ──────────────────
//
// A.2 阶段：保留 setAuthToken/getAuthToken/setOnUnauthorized 三个函数的签名，
// 内部委托给 SecureStore + 内存镜像。后续 A.3 改 services/auth.ts 时切换到
// 直接调 tokenStorage.set/clear，逐步淘汰本节。

let authTokenMemory: string | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authTokenMemory = token;
  // 同步到 SecureStore，让 axios 请求拦截器能从持久层读到 token
  if (token) {
    void tokenStorage.set(token, '').catch(() => {});
  } else {
    void tokenStorage.clear().catch(() => {});
  }
}

export function getAuthToken() {
  return authTokenMemory;
}

export function setOnUnauthorized(cb: (() => void) | null) {
  onUnauthorizedCallback = cb;
}

// ── 通用 request() — 旧 API 兼容，内部委托给 axios 实例 ───────────────

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const config: AxiosRequestConfig = {
    url: path,
    method: method as AxiosRequestConfig['method'],
    headers: init?.headers as Record<string, string> | undefined,
    data: init?.body ? JSON.parse(init.body as string) : undefined,
  };
  const res = await api.request<T>(config);
  if (res.status === 204) return undefined as T;
  return res.data;
}

export function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '';
  return (
    '?' +
    entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
  );
}
