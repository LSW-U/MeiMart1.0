import {
  create as axiosCreate,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/store/authStore';

const env = Constants.expoConfig?.extra as {
  APP_ENV: 'development' | 'staging' | 'production';
  API_BASE_URL: string;
  USE_MOCK?: string;
  SENTRY_DSN: string;
};

const baseURL = env?.API_BASE_URL ?? 'https://api.meimart.example.com';
if (env?.APP_ENV === 'production' && !baseURL.startsWith('https://')) {
  console.error('[security] Production API must use HTTPS. Current:', baseURL);
}

export const api = axiosCreate({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Why: 文档「问题 4」——APP_ENV=development 时永久走 mock，关不掉。
// 加 USE_MOCK=false 显式开关后，联调可切真实，演示切回 mock（删 USE_MOCK 行即恢复默认 mock）。
export const isMockMode =
  env?.USE_MOCK !== 'false' && env?.APP_ENV === 'development';

const TOKEN_KEY = 'meimart.token';
const REFRESH_KEY = 'meimart.refresh';

export const tokenStorage = {
  async get(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  async set(token: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
  },
  async getRefresh(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};

api.interceptors.request.use(async (config) => {
  const authState = useAuthStore.getState();
  const token = authState.accessToken ?? (await tokenStorage.get());
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (__DEV__ && config.data) {
    const safeBody = sanitizeLogPayload(config.data);
    console.debug('[api request]', config.method, config.url, safeBody);
  }
  return config;
});

function sanitizeLogPayload(payload: unknown): unknown {
  if (typeof payload !== 'object' || payload === null) return payload;
  const sensitiveKeys = ['password', 'smsCode', 'token', 'refreshToken', 'secret'];
  const sanitized = { ...(payload as Record<string, unknown>) };
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.includes(key)) sanitized[key] = '***';
  }
  return sanitized;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  const refreshToken = await tokenStorage.getRefresh();
  if (!refreshToken) return null;
  refreshPromise = (async () => {
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string }>(
        '/common/auth/refresh',
        { refreshToken },
      );
      const { accessToken: newToken, refreshToken: newRefresh } = res.data;
      await tokenStorage.set(newToken, newRefresh);
      useAuthStore.getState().setAuth(newToken, newRefresh);
      return newToken;
    } catch {
      useAuthStore.getState().clearAuth();
      await tokenStorage.clear();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

let isRefreshing = false;
let pendingQueue: ((token: string | null) => void)[] = [];

function flushQueue(token: string | null) {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => {
    // Why: 后端响应统一为 { success, data, error? }，service 层 res.data 应直接拿到业务数据，
    // 而不是 { success, data } 壳。剥层后 service 写法保持 axios 原生风格。
    const body = response.data as { success?: boolean; data?: unknown } | undefined;
    if (body && typeof body === 'object' && 'success' in body && typeof body.success === 'boolean') {
      response.data = body.data as unknown;
    }
    return response;
  },
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

    return Promise.reject(error);
  },
);
