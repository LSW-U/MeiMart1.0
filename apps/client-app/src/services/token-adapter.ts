// 批4（任务书 2）：client 端 tokenStorage adapter —— 原平台分支逻辑（api.ts 内联）
// 原样上收为注入实现：Native 走 SecureStore（更安全），Web 走 AsyncStorage
// （SecureStore 不支持 Web，无 native bridge）。
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TokenStorageAdapter } from '@meimart/api-core';

const isWeb = Platform.OS === 'web';

export const clientTokenAdapter: TokenStorageAdapter = {
  async getItem(key) {
    if (isWeb) return AsyncStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async setItem(key, value) {
    if (isWeb) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key) {
    if (isWeb) {
      await AsyncStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
