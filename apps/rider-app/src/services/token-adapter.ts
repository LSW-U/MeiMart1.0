// 批4（任务书 3）：rider 端 tokenStorage adapter —— 原平台分支逻辑原样上收为注入实现
import { Platform } from 'react-native';
import type { TokenStorageAdapter } from '@meimart/api-core';

// expo-secure-store 在 Web 平台不支持（无 native bridge）。
// Web 端 fallback 到 localStorage（不加密，dev 演示用足够；真机走 SecureStore）。
const isWeb = Platform.OS === 'web';

// native 模块懒加载，避免 Web 平台 import 时报错
let SecureStore: typeof import('expo-secure-store') | null = null;
async function getSecureStore() {
  if (!SecureStore) {
    SecureStore = await import('expo-secure-store');
  }
  return SecureStore;
}

export const riderTokenAdapter: TokenStorageAdapter = {
  async getItem(key) {
    if (isWeb) {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    }
    const secureStore = await getSecureStore();
    return secureStore.getItemAsync(key);
  },
  async setItem(key, value) {
    if (isWeb) {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      return;
    }
    const secureStore = await getSecureStore();
    await secureStore.setItemAsync(key, value);
  },
  async deleteItem(key) {
    if (isWeb) {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      return;
    }
    const secureStore = await getSecureStore();
    await secureStore.deleteItemAsync(key);
  },
};
