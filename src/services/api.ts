import axios, {
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
  SENTRY_DSN: string;
};

export const api = axios.create({
  baseURL: env?.API_BASE_URL ?? 'https://api.meimart.example.com',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export const isMockMode = env?.APP_ENV === 'development';

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
  const token = authState.token ?? (await tokenStorage.get());
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  const refreshToken = await tokenStorage.getRefresh();
  if (!refreshToken) return null;
  refreshPromise = (async () => {
    try {
      const res = await axios.post<{ token: string; refreshToken: string }>(
        `${api.defaults.baseURL}/auth/refresh`,
        { refreshToken },
      );
      const { token: newToken, refreshToken: newRefresh } = res.data;
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

    return Promise.reject(error);
  },
);
