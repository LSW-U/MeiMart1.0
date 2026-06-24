import { Platform } from 'react-native';

// expo-secure-store 在 Web 平台不支持（无 native bridge）。
// Web 端 fallback 到 localStorage（不加密，dev 演示用足够；真机走 SecureStore）。
const TOKEN_KEY = 'mei-delivery.token';
const REFRESH_KEY = 'mei-delivery.refresh';

const isWeb = Platform.OS === 'web';

// native 模块懒加载，避免 Web 平台 import 时报错
let SecureStore: typeof import('expo-secure-store') | null = null;
async function getSecureStore() {
  if (!SecureStore) {
    SecureStore = await import('expo-secure-store');
  }
  return SecureStore;
}

export const tokenStorage = {
  async get(): Promise<string | null> {
    try {
      if (isWeb) {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
      }
      const secureStore = await getSecureStore();
      return await secureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  async set(token: string, refreshToken: string): Promise<void> {
    if (isWeb) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(REFRESH_KEY, refreshToken);
      }
      return;
    }
    const secureStore = await getSecureStore();
    await secureStore.setItemAsync(TOKEN_KEY, token);
    await secureStore.setItemAsync(REFRESH_KEY, refreshToken);
  },
  async getRefresh(): Promise<string | null> {
    try {
      if (isWeb) {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null;
      }
      const secureStore = await getSecureStore();
      return await secureStore.getItemAsync(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  async clear(): Promise<void> {
    if (isWeb) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
      }
      return;
    }
    const secureStore = await getSecureStore();
    await secureStore.deleteItemAsync(TOKEN_KEY);
    await secureStore.deleteItemAsync(REFRESH_KEY);
  },
};
